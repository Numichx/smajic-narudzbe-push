import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoTables } from "@/lib/demo/store";
import { racunSpremanZaNaplatu } from "@/lib/domain/racun";

const OtvoreniRacuniSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sto_id: z.number(),
    otvoren_at: z.string(),
    narudzbe: z.array(
      z.object({
        status: z.string(),
        stavke_narudzbe: z.array(
          z.object({
            kolicina: z.number(),
            cijena: z.number(),
            prilozi: z.array(z.object({ cijena: z.number() })),
            stornirano: z.boolean(),
          }),
        ),
      }),
    ),
  }),
);

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json(
      { greska: "Pristup je dozvoljen samo konobarima." },
      { status: 403 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoTables());
    } catch (error) {
      console.error("Učitavanje probnih stolova nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne stolove nije moguće učitati." }, { status: 500 });
    }
  }

  const { data: stolovi, error: greskaStolova } = await supabase
    .from("stolovi")
    .select("id, naziv, aktivan")
    .eq("aktivan", true)
    .order("id");

  if (greskaStolova) {
    console.error("Učitavanje stolova nije uspjelo:", greskaStolova);
    return NextResponse.json(
      { greska: "Stolove nije moguće učitati." },
      { status: 500 },
    );
  }

  const { data: racuni, error: greskaRacuna } = await supabase
    .from("racuni")
    .select(
      "id, sto_id, otvoren_at, narudzbe(status, stavke_narudzbe(kolicina, cijena, prilozi, stornirano))",
    )
    .eq("status", "otvoren");

  if (greskaRacuna) {
    console.error("Učitavanje otvorenih računa nije uspjelo:", greskaRacuna);
    return NextResponse.json(
      { greska: "Otvorene račune nije moguće učitati." },
      { status: 500 },
    );
  }

  const validiraniRacuni = OtvoreniRacuniSchema.safeParse(racuni);
  if (!validiraniRacuni.success) {
    console.error("Otvoreni računi imaju neočekivan oblik:", validiraniRacuni.error);
    return NextResponse.json(
      { greska: "Podaci otvorenih računa nisu ispravni." },
      { status: 500 },
    );
  }

  const { data: veze, error: greskaVeza } = await supabase
    .from("racun_stolovi")
    .select("racun_id, sto_id");
  if (greskaVeza) {
    console.error("Učitavanje stolova računa nije uspjelo:", greskaVeza);
    return NextResponse.json(
      { greska: "Povezane stolove nije moguće učitati." },
      { status: 500 },
    );
  }

  const racuniPoId = new Map(
    validiraniRacuni.data.map((racun) => {
      const ukupno = racun.narudzbe
        .flatMap((narudzba) => narudzba.stavke_narudzbe)
        .reduce(
          (suma, stavka) => suma + (stavka.stornirano ? 0 :
            stavka.cijena * stavka.kolicina +
            stavka.prilozi.reduce((prilozi, prilog) => prilozi + prilog.cijena, 0)),
          0,
        );

      return [
        racun.id,
        {
          ukupno: Math.round((ukupno + Number.EPSILON) * 100) / 100,
          otvorenAt: racun.otvoren_at,
          minute: Math.max(
            0,
            Math.floor((Date.now() - new Date(racun.otvoren_at).getTime()) / 60_000),
          ),
          cekaNaplatu: racunSpremanZaNaplatu(racun.narudzbe),
        },
      ] as const;
    }),
  );
  const otvoreniPoStolu = new Map(
    (veze ?? []).flatMap((veza) => {
      const racun = racuniPoId.get(veza.racun_id);
      return racun
        ? [[veza.sto_id, { racunId: veza.racun_id, ...racun }] as const]
        : [];
    }),
  );

  return NextResponse.json({
    stolovi: stolovi.map((sto) => ({
      ...sto,
      racun: otvoreniPoStolu.get(sto.id) ?? null,
    })),
  });
}
