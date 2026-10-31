import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCreateOrder, demoStationOrders } from "@/lib/demo/store";

const NovaNarudzbaSchema = z.object({
  requestId: z.string().uuid(),
  stoId: z.number().int().min(1).max(20),
  stavke: z
    .array(
      z.object({
        proizvodId: z.string().uuid(),
        kolicina: z.number().positive().max(9999),
        napomena: z.string().trim().max(500).optional(),
        prilozi: z.array(z.object({
          proizvodId: z.string().uuid(),
          standard: z.boolean().default(false),
          poseban: z.boolean().default(false),
        })).max(4).default([]),
      }),
    )
    .min(1)
    .max(100),
  posebanPin: z.string().regex(/^\d{4,8}$/).optional(),
}).superRefine((narudzba, context) => {
  const svaStavke = new Set<string>();
  for (const [index, stavka] of narudzba.stavke.entries()) {
    if (svaStavke.has(stavka.proizvodId)) {
      context.addIssue({
        code: "custom",
        path: ["stavke", index, "proizvodId"],
        message: "Isti proizvod navedite samo jednom.",
      });
    }
    svaStavke.add(stavka.proizvodId);
    const prilozi = new Set<string>();
    for (const prilog of stavka.prilozi) {
      if (prilozi.has(prilog.proizvodId)) {
        context.addIssue({
          code: "custom",
          path: ["stavke", index, "prilozi"],
          message: "Isti prilog ne može biti izabran više puta.",
        });
      }
      if (prilog.standard && prilog.poseban) {
        context.addIssue({
          code: "custom",
          path: ["stavke", index, "prilozi"],
          message: "Poseban prilog ne može biti standardni.",
        });
      }
      prilozi.add(prilog.proizvodId);
    }
    if (stavka.prilozi.some((prilog) => prilog.poseban) && !narudzba.posebanPin) {
      context.addIssue({
        code: "custom",
        path: ["posebanPin"],
        message: "Poseban prilog zahtijeva PIN.",
      });
    }
  }
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();

  if (sesija?.uloga !== "konobar") {
    return NextResponse.json(
      { greska: "Prijavite se kao konobar prije slanja narudžbe." },
      { status: 401 },
    );
  }

  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = NovaNarudzbaSchema.safeParse(tijelo);

  if (!rezultat.success) {
    return NextResponse.json(
      { greska: "Podaci narudžbe nisu ispravni." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const narudzba = await demoCreateOrder({
        ...rezultat.data,
        konobarIme: sesija.ime,
      });
      return NextResponse.json({ narudzba }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Narudžbu nije moguće sačuvati u probnom načinu." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("posalji_narudzbu_idempotentnu", {
    p_request_id: rezultat.data.requestId,
    p_sto_id: rezultat.data.stoId,
    p_konobar_ime: sesija.ime,
    p_stavke: rezultat.data.stavke.map((stavka) => ({
      proizvod_id: stavka.proizvodId,
      kolicina: stavka.kolicina,
      napomena: stavka.napomena ?? "",
      prilozi: stavka.prilozi.map((prilog) => ({
        proizvod_id: prilog.proizvodId,
        standard: prilog.standard,
        poseban: prilog.poseban,
      })),
      poseban_pin: stavka.prilozi.some((prilog) => prilog.poseban)
        ? rezultat.data.posebanPin ?? null
        : null,
    })),
  });

  if (error) {
    console.error("Slanje narudžbe nije uspjelo:", error);
    // P0001 su poruke iz same SQL funkcije, a klase 22/23 neispravni podaci;
    // sve ostalo je privremena greška pa offline red smije pokušati ponovo.
    const odbijeno = error.code === "P0001" || /^2[23]/.test(error.code ?? "");
    return odbijeno
      ? NextResponse.json({ greska: error.message }, { status: 422 })
      : NextResponse.json(
          { greska: "Narudžbu trenutno nije moguće sačuvati. Pokušajte ponovo." },
          { status: 503 },
        );
  }

  return NextResponse.json({ narudzba: data }, { status: 201 });
}

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || (sesija.uloga !== "kuhinja" && sesija.uloga !== "pecenjara" && sesija.uloga !== "sank")) {
    return NextResponse.json(
      { greska: "Pristup je dozvoljen samo stanicama." },
      { status: 403 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoStationOrders(sesija.uloga));
    } catch (error) {
      console.error("Učitavanje probnog reda nije uspjelo:", error);
      return NextResponse.json({ greska: "Probni red narudžbi nije moguće učitati." }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("narudzbe")
    .select(
      "id, broj, stanica, status, kreirano_at, stavke_narudzbe(id, naziv, jedinica, kolicina, cijena, napomena, prilozi, stornirano)",
    )
    .eq("stanica", sesija.uloga)
    .neq("status", "Izdato")
    .order("kreirano_at", { ascending: true });

  if (error) {
    console.error("Učitavanje reda narudžbi nije uspjelo:", error);
    return NextResponse.json(
      { greska: "Red narudžbi nije moguće učitati." },
      { status: 500 },
    );
  }

  const sada = Date.now();
  return NextResponse.json({
    narudzbe: data.map((narudzba) => ({
      ...narudzba,
      cekaDugo:
        sada - new Date(narudzba.kreirano_at).getTime() >= 15 * 60 * 1000,
    })),
  });
}
