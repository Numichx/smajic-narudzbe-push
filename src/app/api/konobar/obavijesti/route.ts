import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoIssuedOrdersSince } from "@/lib/demo/store";

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Obavijesti su dostupne samo konobarima." }, { status: 403 });
  }
  const od = new URL(request.url).searchParams.get("od");
  const datum = z.string().datetime().safeParse(od);
  if (!datum.success) {
    return NextResponse.json({ greska: "Vrijeme za obavijesti nije ispravno." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoIssuedOrdersSince(datum.data));
    } catch (error) {
      console.error("Učitavanje probnih obavijesti nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne obavijesti nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("narudzbe")
    .select("id, broj, stanica, izmijenjeno_at")
    .eq("status", "Izdato")
    .gte("izmijenjeno_at", datum.data)
    .order("izmijenjeno_at", { ascending: true })
    .limit(50);
  if (error) {
    console.error("Učitavanje obavijesti nije uspjelo:", error);
    return NextResponse.json({ greska: "Obavijesti nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ obavijesti: data });
}
