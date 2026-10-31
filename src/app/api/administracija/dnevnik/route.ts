import { NextResponse } from "next/server";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoActivityLog } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može pregledati dnevnik." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoActivityLog());
    } catch (error) {
      console.error("Učitavanje probnog dnevnika nije uspjelo:", error);
      return NextResponse.json({ greska: "Probni dnevnik nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("dnevnik_radnji")
    .select("id, akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji, kreirano_at")
    .order("kreirano_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("Učitavanje dnevnika nije uspjelo:", error);
    return NextResponse.json({ greska: "Dnevnik nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ dnevnik: data });
}
