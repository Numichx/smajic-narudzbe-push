import { NextResponse } from "next/server";
import { procitajPeriod } from "@/lib/api/period";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoReport } from "@/lib/demo/store";

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može pregledati izvještaje." }, { status: 403 });
  }
  const period = procitajPeriod(request.url);
  if (!period) {
    return NextResponse.json({ greska: "Period izvještaja nije ispravan." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({
        period: period.dani, od: period.od,
        do: period.do, izvjestaj: await demoReport(period.od),
      });
    } catch (error) {
      console.error("Izračun probnog izvještaja nije uspio:", error);
      return NextResponse.json({ greska: "Probni izvještaj nije moguće izračunati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase.rpc("izvjestaj_period", {
    p_od: period.od,
    p_do: period.do,
  });
  if (error) {
    console.error("Izvještaj nije moguće izračunati:", error);
    return NextResponse.json({ greska: "Izvještaj nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ period: period.dani, od: period.od, do: period.do, izvjestaj: data });
}
