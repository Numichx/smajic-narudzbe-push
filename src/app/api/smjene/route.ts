import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCloseShift, demoOpenShift, demoShifts } from "@/lib/demo/store";

const PopisSchema = z.record(z.string().max(100), z.number().nonnegative().max(100000));

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["sefica", "konobar", "sank"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda smjene." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoShifts());
    } catch (error) {
      console.error("Učitavanje probnih smjena nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne smjene nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("smjene")
    .select("id, oznaka, pocetak_at, preuzeo_ime, status, pocetni_popis_sanka, zavrsni_popis_sanka, predani_pazar, zatvorio_ime, zatvoreno_at, bar_pazar, kuhinja_pecenjara_pazar, ocekivani_pazar, razlika_pazara")
    .order("pocetak_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("Učitavanje smjena nije uspjelo:", error);
    return NextResponse.json({ greska: "Smjene nije moguće učitati." }, { status: 500 });
  }
  const smjene = data ?? [];
  const smjenaIds = smjene.map((smjena) => smjena.id);
  const { data: popisiPecenjare, error: greskaPopisa } = smjenaIds.length
    ? await supabase
      .from("pecenjara_popisi_smjena")
      .select("smjena_id, zatvoreno_at")
      .in("smjena_id", smjenaIds)
    : { data: [], error: null };
  if (greskaPopisa) {
    console.error("Učitavanje statusa popisa pečenjare nije uspjelo:", greskaPopisa);
    return NextResponse.json({ greska: "Status popisa pečenjare nije moguće učitati." }, { status: 500 });
  }
  const zatvoreniPopisi = new Set(
    (popisiPecenjare ?? [])
      .filter((popis) => popis.zatvoreno_at !== null)
      .map((popis) => popis.smjena_id),
  );
  return NextResponse.json({
    smjene: smjene.map((smjena) => ({
      ...smjena,
      popis_pecenjare_zatvoren: zatvoreniPopisi.has(smjena.id),
    })),
  });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["sefica", "konobar", "sank"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Samo šefica, konobar ili šank može preuzeti smjenu." }, { status: 403 });
  }
  const schema = z.object({
    oznaka: z.enum(["I", "II"]),
    popisSanka: PopisSchema.default({}),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) return NextResponse.json({ greska: "Podaci smjene nisu ispravni." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const smjenaId = await demoOpenShift({
        oznaka: rezultat.data.oznaka,
        actor: sesija.ime,
        startingCount: rezultat.data.popisSanka,
      });
      return NextResponse.json({ smjenaId }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Smjenu nije moguće otvoriti." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("otvori_smjenu", {
    p_oznaka: rezultat.data.oznaka,
    p_preuzeo_ime: sesija.ime,
    p_popis_sanka: rezultat.data.popisSanka,
  });
  if (error) {
    console.error("Otvaranje smjene nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ smjenaId: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["sefica", "konobar", "sank"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Samo šefica, konobar ili šank može zaključiti smjenu." }, { status: 403 });
  }
  const schema = z.object({
    id: z.string().uuid(),
    popisSanka: PopisSchema,
    predaniPazar: z.number().nonnegative(),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) return NextResponse.json({ greska: "Podaci za zatvaranje smjene nisu ispravni." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const izvjestaj = await demoCloseShift({
        id: rezultat.data.id,
        finalCount: rezultat.data.popisSanka,
        tendered: rezultat.data.predaniPazar,
        actor: sesija.ime,
      });
      return NextResponse.json({ izvjestaj });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Smjenu nije moguće zatvoriti." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("zatvori_smjenu", {
    p_smjena_id: rezultat.data.id,
    p_popis_sanka: rezultat.data.popisSanka,
    p_predani_pazar: rezultat.data.predaniPazar,
    p_zatvorio_ime: sesija.ime,
  });
  if (error) {
    console.error("Zatvaranje smjene nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ izvjestaj: data });
}
