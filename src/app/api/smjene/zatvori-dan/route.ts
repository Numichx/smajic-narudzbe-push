import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCloseBusinessDay } from "@/lib/demo/store";

export async function POST() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može zatvoriti dan." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ zakljucak: await demoCloseBusinessDay(sesija.ime) });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Dan nije moguće zatvoriti." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("zatvori_dan", { p_akter_ime: sesija.ime });
  if (error) {
    console.error("Zatvaranje dana nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ zakljucak: data });
}
