import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoBillForTable } from "@/lib/demo/store";
import { primijeniPopust, racunSpremanZaNaplatu } from "@/lib/domain/racun";

const RacunSchema = z.object({
  id: z.string().uuid(),
  broj: z.number(),
  sto_id: z.number(),
  konobar_ime: z.string(),
  otvoren_at: z.string(),
  podijeljeno_na: z.number().nullable(),
  popust_procenat: z.number(),
  popust_razlog: z.string().nullable(),
  narudzbe: z.array(
    z.object({
      id: z.string().uuid(),
      broj: z.string(),
      stanica: z.string(),
      status: z.string(),
      kreirano_at: z.string(),
      stavke_narudzbe: z.array(
        z.object({
          id: z.string().uuid(),
          naziv: z.string(),
          jedinica: z.string(),
          kolicina: z.number(),
          cijena: z.number(),
          napomena: z.string().nullable(),
          prilozi: z.array(z.object({
            naziv: z.string(),
            cijena: z.number(),
            poseban: z.boolean().optional(),
          })),
          stornirano: z.boolean(),
          storno_razlog: z.string().nullable(),
          storno_vrijednost: z.number().nullable(),
        }),
      ),
    }),
  ),
  stolovi: z.array(z.object({ id: z.number(), naziv: z.string() })),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stoId: string }> },
) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Pristup je dozvoljen samo konobarima." }, { status: 403 });
  }

  const { stoId: parametar } = await params;
  const stoId = Number(parametar);
  if (!Number.isInteger(stoId) || stoId < 1 || stoId > 20) {
    return NextResponse.json({ greska: "Nepoznat sto." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ racun: await demoBillForTable(stoId) });
    } catch (error) {
      console.error("Učitavanje probnog računa nije uspjelo:", error);
      return NextResponse.json({ greska: "Probni račun nije moguće učitati." }, { status: 500 });
    }
  }

  const { data: sto, error: greskaStola } = await supabase
    .from("stolovi")
    .select("id")
    .eq("id", stoId)
    .maybeSingle();

  if (greskaStola || !sto) {
    if (greskaStola) console.error("Učitavanje stola nije uspjelo:", greskaStola);
    return NextResponse.json({ greska: "Sto nije pronađen." }, { status: 404 });
  }

  const { data: povezaniRacun, error: greskaVeze } = await supabase
    .from("racun_stolovi")
    .select("racun_id")
    .eq("sto_id", stoId)
    .maybeSingle();

  if (greskaVeze) {
    console.error("Učitavanje veze stola i računa nije uspjelo:", greskaVeze);
    return NextResponse.json({ greska: "Račun nije moguće učitati." }, { status: 500 });
  }
  if (!povezaniRacun) return NextResponse.json({ racun: null });

  const { data, error } = await supabase
    .from("racuni")
    .select(
      "id, broj, sto_id, konobar_ime, otvoren_at, podijeljeno_na, popust_procenat, popust_razlog, narudzbe(id, broj, stanica, status, kreirano_at, stavke_narudzbe(id, naziv, jedinica, kolicina, cijena, napomena, prilozi, stornirano, storno_razlog, storno_vrijednost)), stolovi:racun_stolovi(stolovi(id, naziv))",
    )
    .eq("id", povezaniRacun.racun_id)
    .eq("status", "otvoren")
    .maybeSingle();

  if (error) {
    console.error("Učitavanje računa nije uspjelo:", error);
    return NextResponse.json({ greska: "Račun nije moguće učitati." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ racun: null });

  const provjera = RacunSchema.safeParse({
    ...data,
    stolovi: data.stolovi.flatMap((veza) => veza.stolovi ?? []),
  });
  if (!provjera.success) {
    console.error("Račun ima neočekivan oblik:", provjera.error);
    return NextResponse.json({ greska: "Podaci računa nisu ispravni." }, { status: 500 });
  }

  const ukupno = provjera.data.narudzbe
    .flatMap((narudzba) => narudzba.stavke_narudzbe)
    .reduce(
      (suma, stavka) =>
        suma +
        (stavka.stornirano
          ? 0
          : stavka.cijena * stavka.kolicina +
            stavka.prilozi.reduce((prilozi, prilog) => prilozi + prilog.cijena, 0)),
      0,
    );

  return NextResponse.json({
    racun: {
      ...provjera.data,
      bruto: Math.round((ukupno + Number.EPSILON) * 100) / 100,
      ukupno: primijeniPopust(ukupno, provjera.data.popust_procenat),
      sveIzdato: racunSpremanZaNaplatu(provjera.data.narudzbe),
    },
  });
}
