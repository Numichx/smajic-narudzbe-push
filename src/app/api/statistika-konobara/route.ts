import { NextResponse } from "next/server";
import { procitajPeriod } from "@/lib/api/period";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sviRedovi } from "@/lib/supabase/sviRedovi";
import { demoWaiterStats } from "@/lib/demo/store";

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Statistika je dostupna samo konobarima." }, { status: 403 });
  }
  const period = procitajPeriod(request.url);
  if (!period) {
    return NextResponse.json({ greska: "Period statistike nije ispravan." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoWaiterStats(sesija.ime, period.dani, period.od));
    } catch (error) {
      console.error("Probna statistika konobara nije uspjela:", error);
      return NextResponse.json({ greska: "Probnu statistiku nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await sviRedovi((odReda, doReda) => supabase
    .from("naplate")
    .select("ukupno, baksis, nacin, kreirano_at")
    .eq("naplatio_ime", sesija.ime)
    .gte("kreirano_at", period.od)
    .lt("kreirano_at", period.do)
    .order("id")
    .range(odReda, doReda));
  if (error) {
    console.error("Statistika konobara nije uspjela:", error);
    return NextResponse.json({ greska: "Statistiku nije moguće učitati." }, { status: 500 });
  }
  const stavke = data ?? [];
  const naplaceno = stavke.filter((stavka) => stavka.nacin !== "dug");
  const promet = naplaceno.reduce((suma, stavka) => suma + Number(stavka.ukupno), 0);
  const baksis = stavke.reduce((suma, stavka) => suma + Number(stavka.baksis), 0);
  const dug = stavke
    .filter((stavka) => stavka.nacin === "dug")
    .reduce((suma, stavka) => suma + Number(stavka.ukupno), 0);
  return NextResponse.json({
    period: period.dani,
    ime: sesija.ime,
    brojRacuna: stavke.length,
    naplaceno: Math.round(promet * 100) / 100,
    dug: Math.round(dug * 100) / 100,
    prosjecanRacun: naplaceno.length ? Math.round((promet / naplaceno.length) * 100) / 100 : 0,
    baksis: Math.round(baksis * 100) / 100,
  });
}
