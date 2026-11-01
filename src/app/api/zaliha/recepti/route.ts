import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoRecipes, demoSaveRecipe } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može upravljati receptima." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoRecipes());
    } catch (error) {
      console.error("Učitavanje probnih recepata nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne recepte nije moguće učitati." }, { status: 500 });
    }
  }
  const [{ data: proizvodi, error: greskaProizvoda }, { data: zaliha, error: greskaZalihe }, { data: recepti, error: greskaRecepata }] = await Promise.all([
    supabase.from("proizvodi").select("id, naziv, stanica").eq("aktivan", true).order("naziv"),
    supabase.from("zaliha_artikli").select("id, naziv, jedinica").eq("aktivan", true).order("naziv"),
    supabase.from("recepti").select("id, proizvod_id, sastojci_recepta(zaliha_id, kolicina)"),
  ]);
  if (greskaProizvoda || greskaZalihe || greskaRecepata) {
    console.error("Učitavanje recepata nije uspjelo:", greskaProizvoda ?? greskaZalihe ?? greskaRecepata);
    return NextResponse.json({ greska: "Recepte nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ proizvodi, zaliha, recepti });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može mijenjati recepte." }, { status: 403 });
  }
  const schema = z.object({
    proizvodId: z.string().uuid(),
    sastojci: z.array(z.object({
      zalihaId: z.string().uuid(),
      kolicina: z.number().positive().max(1000),
    })).max(50),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Podaci recepta nisu ispravni." }, { status: 400 });
  }
  if (new Set(rezultat.data.sastojci.map((stavka) => stavka.zalihaId)).size !== rezultat.data.sastojci.length) {
    return NextResponse.json({ greska: "Isti sastojak ne može biti naveden više puta." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const receptId = await demoSaveRecipe(
        rezultat.data.proizvodId,
        rezultat.data.sastojci.map((item) => ({ stockId: item.zalihaId, quantity: item.kolicina })),
      );
      return NextResponse.json({ receptId });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Recept nije sačuvan." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("sacuvaj_recept", {
    p_proizvod_id: rezultat.data.proizvodId,
    p_sastojci: rezultat.data.sastojci.map((stavka) => ({
      zaliha_id: stavka.zalihaId,
      kolicina: stavka.kolicina,
    })),
  });
  if (error) {
    console.error("Čuvanje recepta nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ receptId: data });
}
