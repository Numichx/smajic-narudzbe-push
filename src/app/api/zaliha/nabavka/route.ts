import { NextResponse } from "next/server";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoPurchaseSuggestions } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može pregledati prijedlog nabavke." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoPurchaseSuggestions());
    } catch (error) {
      console.error("Probni prijedlog nabavke nije uspio:", error);
      return NextResponse.json({ greska: "Probni prijedlog nabavke nije moguće izračunati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase.rpc("prijedlog_nabavke");
  if (error) {
    console.error("Prijedlog nabavke nije uspio:", error);
    return NextResponse.json({ greska: "Prijedlog nabavke nije moguće izračunati." }, { status: 500 });
  }
  return NextResponse.json({ nabavka: data });
}
