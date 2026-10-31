import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoReport } from "@/lib/demo/store";

const PeriodSchema = z.enum(["1", "7", "30"]);

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može pregledati izvještaje." }, { status: 403 });
  }
  const parametar = new URL(request.url).searchParams.get("dani") ?? "1";
  const rezultat = PeriodSchema.safeParse(parametar);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Period može biti 1, 7 ili 30 dana." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const odDatuma = new Date();
      odDatuma.setDate(odDatuma.getDate() - Number(rezultat.data));
      return NextResponse.json({
        period: Number(rezultat.data), od: odDatuma.toISOString(),
        do: new Date().toISOString(), izvjestaj: await demoReport(Number(rezultat.data)),
      });
    } catch (error) {
      console.error("Izračun probnog izvještaja nije uspio:", error);
      return NextResponse.json({ greska: "Probni izvještaj nije moguće izračunati." }, { status: 500 });
    }
  }
  const doDatuma = new Date();
  const odDatuma = new Date(doDatuma);
  odDatuma.setDate(odDatuma.getDate() - Number(rezultat.data));
  const { data, error } = await supabase.rpc("izvjestaj_period", {
    p_od: odDatuma.toISOString(),
    p_do: doDatuma.toISOString(),
  });
  if (error) {
    console.error("Izvještaj nije moguće izračunati:", error);
    return NextResponse.json({ greska: "Izvještaj nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ period: Number(rezultat.data), od: odDatuma.toISOString(), do: doDatuma.toISOString(), izvjestaj: data });
}
