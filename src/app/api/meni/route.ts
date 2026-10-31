import { NextResponse } from "next/server";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoMenu } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija) {
    return NextResponse.json({ greska: "Prijavite se za pregled menija." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoMenu());
    } catch (error) {
      console.error("Učitavanje probnog menija nije uspjelo:", error);
      return NextResponse.json({ greska: "Probni meni nije moguće učitati." }, { status: 500 });
    }
  }

  const { data: kategorije, error: greskaKategorija } = await supabase
    .from("kategorije_menija")
    .select("id, naziv, redoslijed")
    .eq("aktivna", true)
    .order("redoslijed");

  if (greskaKategorija) {
    console.error("Učitavanje kategorija menija nije uspjelo:", greskaKategorija);
    return NextResponse.json(
      { greska: "Meni nije moguće učitati." },
      { status: 500 },
    );
  }

  const { data: proizvodi, error: greskaProizvoda } = await supabase
    .from("proizvodi")
    .select(
      "id, kategorija_id, naziv, cijena, jedinica, stanica, napomena_cijene, redoslijed",
    )
    .eq("aktivan", true)
    .not("cijena", "is", null)
    .order("redoslijed");

  if (greskaProizvoda) {
    console.error("Učitavanje proizvoda nije uspjelo:", greskaProizvoda);
    return NextResponse.json(
      { greska: "Meni nije moguće učitati." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    kategorije: kategorije.map((kategorija) => ({
      ...kategorija,
      proizvodi: proizvodi.filter(
        (proizvod) => proizvod.kategorija_id === kategorija.id,
      ),
    })),
  });
}
