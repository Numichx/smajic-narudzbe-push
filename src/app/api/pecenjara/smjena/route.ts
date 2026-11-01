import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import {
  demoCloseRoastingCount,
  demoOpenRoastingCount,
  demoRoastingShiftCounts,
} from "@/lib/demo/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const PocetniPopisSchema = z.object({
  smjenaId: z.string().uuid(),
  pocetneKokePecene: z.number().int().nonnegative().max(100000),
  pocetneKokeSirove: z.number().int().nonnegative().max(100000),
  pocetnaJanjetinaKg: z.number().nonnegative().max(100000)
    .transform((value) => Math.round(value * 1000) / 1000),
});

const ZavrsniPopisSchema = z.object({
  smjenaId: z.string().uuid(),
  dodatneKoke: z.number().int().nonnegative().max(100000),
  dodatnaJanjetinaKg: z.number().nonnegative().max(100000)
    .transform((value) => Math.round(value * 1000) / 1000),
  preostaleKoke: z.number().int().nonnegative().max(100000),
  preostalaJanjetinaKg: z.number().nonnegative().max(100000)
    .transform((value) => Math.round(value * 1000) / 1000),
  predaniPazar: z.number().nonnegative().max(100000000)
    .transform((value) => Math.round(value * 100) / 100),
});

function dozvoljenaUloga(uloga: string) {
  return uloga === "pecenjara" || uloga === "sefica";
}

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !dozvoljenaUloga(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda popisa pečenjare." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoRoastingShiftCounts());
    } catch (error) {
      console.error("Učitavanje probnog popisa pečenjare nije uspjelo:", error);
      return NextResponse.json({ greska: "Popis pečenjare nije moguće učitati." }, { status: 500 });
    }
  }

  const [{ data: aktivnaSmjena, error: greskaSmjene }, { data: historija, error: greskaHistorije }] = await Promise.all([
    supabase
      .from("smjene")
      .select("id, oznaka, pocetak_at, preuzeo_ime")
      .eq("status", "otvorena")
      .order("pocetak_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("pecenjara_popisi_smjena")
      .select("*")
      .order("kreirano_at", { ascending: false })
      .limit(20),
  ]);
  if (greskaSmjene || greskaHistorije) {
    console.error("Učitavanje popisa pečenjare nije uspjelo:", greskaSmjene ?? greskaHistorije);
    return NextResponse.json({ greska: "Popis pečenjare nije moguće učitati." }, { status: 500 });
  }

  const popis = aktivnaSmjena
    ? (historija ?? []).find((stavka) => stavka.smjena_id === aktivnaSmjena.id) ?? null
    : null;
  return NextResponse.json({
    aktivnaSmjena,
    popis,
    historija: historija ?? [],
  });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !dozvoljenaUloga(sesija.uloga)) {
    return NextResponse.json({ greska: "Samo pečenjara ili šefica može unijeti početni popis." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = PocetniPopisSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Početni popis pečenjare nije ispravan." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const popis = await demoOpenRoastingCount({
        ...rezultat.data,
        actor: sesija.ime,
      });
      return NextResponse.json({ popis }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Početni popis nije sačuvan." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("otvori_popis_pecenjare", {
    p_smjena_id: rezultat.data.smjenaId,
    p_pocetne_koke_pecene: rezultat.data.pocetneKokePecene,
    p_pocetne_koke_sirove: rezultat.data.pocetneKokeSirove,
    p_pocetna_janjetina_kg: rezultat.data.pocetnaJanjetinaKg,
    p_evidentirao_uloga: sesija.uloga,
    p_evidentirao_ime: sesija.ime,
  });
  if (error) {
    console.error("Početni popis pečenjare nije sačuvan:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ popis: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !dozvoljenaUloga(sesija.uloga)) {
    return NextResponse.json({ greska: "Samo pečenjara ili šefica može zaključiti popis." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = ZavrsniPopisSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Završni popis pečenjare nije ispravan." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const popis = await demoCloseRoastingCount({
        ...rezultat.data,
        actor: sesija.ime,
      });
      return NextResponse.json({ popis });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Popis nije moguće zaključiti." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("zatvori_popis_pecenjare", {
    p_smjena_id: rezultat.data.smjenaId,
    p_dodatne_koke: rezultat.data.dodatneKoke,
    p_dodatna_janjetina_kg: rezultat.data.dodatnaJanjetinaKg,
    p_preostale_koke: rezultat.data.preostaleKoke,
    p_preostala_janjetina_kg: rezultat.data.preostalaJanjetinaKg,
    p_predani_pazar: rezultat.data.predaniPazar,
    p_evidentirao_uloga: sesija.uloga,
    p_evidentirao_ime: sesija.ime,
  });
  if (error) {
    console.error("Završni popis pečenjare nije sačuvan:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ popis: data });
}
