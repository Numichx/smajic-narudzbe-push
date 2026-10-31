import { NextResponse } from "next/server";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoBarArticles } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["sank", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda artikala šanka." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoBarArticles());
    } catch (error) {
      console.error("Učitavanje probnih artikala šanka nije uspjelo:", error);
      return NextResponse.json({ greska: "Artikle šanka nije moguće učitati." }, { status: 500 });
    }
  }
  const [{ data: artikli, error: greskaArtikala }, { data: smjena, error: greskaSmjene }] = await Promise.all([
    supabase.from("proizvodi").select("id, naziv, cijena, jedinica").eq("stanica", "sank").eq("aktivan", true).not("cijena", "is", null).order("naziv"),
    supabase.from("smjene").select("id, oznaka, preuzeo_ime, pocetni_popis_sanka, pocetak_at").eq("status", "otvorena").maybeSingle(),
  ]);
  if (greskaArtikala || greskaSmjene) {
    console.error("Učitavanje artikala ili smjene šanka nije uspjelo:", greskaArtikala ?? greskaSmjene);
    return NextResponse.json({ greska: "Podatke šanka nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ artikli, smjena });
}
