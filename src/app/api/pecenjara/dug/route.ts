import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoButcherDebts, demoButcherPayment } from "@/lib/demo/store";
import type { PostgrestError } from "@supabase/supabase-js";

// Supabase vraća najviše 1000 redova po upitu (max_rows), a dug se računa iz
// cijele historije, pa se redovi čitaju po stranicama.
const VELICINA_STRANICE = 1000;

async function sviRedovi<T>(
  upit: (od: number, doReda: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<{ data: T[]; error: null } | { data: null; error: PostgrestError }> {
  const redovi: T[] = [];
  for (let od = 0; ; od += VELICINA_STRANICE) {
    const { data, error } = await upit(od, od + VELICINA_STRANICE - 1);
    if (error) return { data: null, error };
    redovi.push(...(data ?? []));
    if (!data || data.length < VELICINA_STRANICE) return { data: redovi, error: null };
  }
}

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["pecenjara", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda duga pečenjare." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoButcherDebts());
    } catch (error) {
      console.error("Probni dug pečenjare nije moguće učitati:", error);
      return NextResponse.json({ greska: "Probni dug pečenjare nije moguće učitati." }, { status: 500 });
    }
  }
  const [{ data: narudzbe, error: greskaNarudzbi }, { data: uplate, error: greskaUplata }] = await Promise.all([
    sviRedovi((od, doReda) => supabase.from("narudzbe")
      .select("kreirao_ime, cijena_pecenjari")
      .eq("stanica", "pecenjara").eq("status", "Izdato")
      .order("id").range(od, doReda)),
    sviRedovi((od, doReda) => supabase.from("uplate_pecenjari")
      .select("konobar_ime, iznos")
      .order("id").range(od, doReda)),
  ]);
  if (greskaNarudzbi || greskaUplata) {
    console.error("Učitavanje duga pečenjare nije uspjelo:", greskaNarudzbi ?? greskaUplata);
    return NextResponse.json({ greska: "Dug pečenjare nije moguće učitati." }, { status: 500 });
  }
  const ukupnoPoKonobaru = new Map<string, number>();
  const uplatePoKonobaru = new Map<string, number>();
  for (const narudzba of narudzbe ?? []) {
    const key = narudzba.kreirao_ime.toLocaleLowerCase("bs");
    const prethodno = ukupnoPoKonobaru.get(key);
    ukupnoPoKonobaru.set(key, (prethodno?.valueOf() ?? 0) + Number(narudzba.cijena_pecenjari ?? 0));
  }
  for (const uplata of uplate ?? []) {
    const key = uplata.konobar_ime.toLocaleLowerCase("bs");
    uplatePoKonobaru.set(key, (uplatePoKonobaru.get(key) ?? 0) + Number(uplata.iznos));
  }
  const dugovi = Array.from(ukupnoPoKonobaru, ([key, izdato]) => ({
    ime: (narudzbe ?? []).find((narudzba) => narudzba.kreirao_ime.toLocaleLowerCase("bs") === key)?.kreirao_ime ?? key,
    izdato,
    placeno: uplatePoKonobaru.get(key) ?? 0,
    dug: Math.round((izdato - (uplatePoKonobaru.get(key) ?? 0)) * 100) / 100,
  })).sort((a, b) => b.dug - a.dug);
  return NextResponse.json({ dugovi });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "pecenjara") {
    return NextResponse.json({ greska: "Samo pečenjara može evidentirati uplatu." }, { status: 403 });
  }
  const schema = z.object({
    konobarIme: z.string().trim().min(2).max(80),
    iznos: z.number().positive(),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Ime konobara i iznos uplate nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ uplata: await demoButcherPayment({
        waiter: rezultat.data.konobarIme, amount: rezultat.data.iznos,
      }) }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Uplata nije evidentirana." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("registruj_uplatu_pecenjari", {
    p_konobar_ime: rezultat.data.konobarIme,
    p_iznos: rezultat.data.iznos,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Uplata pečenjari nije uspjela:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ uplata: data }, { status: 201 });
}
