import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoIssuedOrdersSince } from "@/lib/demo/store";

// Vrijeme za sljedeći upit dolazi sa servera ("sada"), pa pogrešan sat na
// tabletu ne može sakriti niti ponoviti obavijesti.
export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Obavijesti su dostupne samo konobarima." }, { status: 403 });
  }
  const sada = new Date().toISOString();
  const od = new URL(request.url).searchParams.get("od");
  if (od === null) {
    return NextResponse.json({ obavijesti: [], sada });
  }
  const datum = z.string().datetime({ offset: true }).safeParse(od);
  if (!datum.success) {
    return NextResponse.json({ greska: "Vrijeme za obavijesti nije ispravno." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ ...await demoIssuedOrdersSince(datum.data, sesija.ime), sada });
    } catch (error) {
      console.error("Učitavanje probnih obavijesti nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne obavijesti nije moguće učitati." }, { status: 500 });
    }
  }
  // Potpuno stornirana narudžba se zatvara bez izdavanja, pa o njoj nema obavijesti.
  const { data, error } = await supabase
    .from("narudzbe")
    .select("id, broj, stanica, izmijenjeno_at, stavke_narudzbe!inner(id)")
    .eq("status", "Izdato")
    .eq("kreirao_ime", sesija.ime)
    .eq("stavke_narudzbe.stornirano", false)
    .gte("izmijenjeno_at", datum.data)
    .order("izmijenjeno_at", { ascending: true })
    .limit(50);
  if (error) {
    console.error("Učitavanje obavijesti nije uspjelo:", error);
    return NextResponse.json({ greska: "Obavijesti nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({
    obavijesti: data.map(({ id, broj, stanica, izmijenjeno_at }) => ({ id, broj, stanica, izmijenjeno_at })),
    sada,
  });
}
