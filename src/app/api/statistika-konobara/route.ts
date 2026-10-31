import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoWaiterStats } from "@/lib/demo/store";

const PeriodSchema = z.enum(["1", "7", "30"]);

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Statistika je dostupna samo konobarima." }, { status: 403 });
  }
  const rezultat = PeriodSchema.safeParse(new URL(request.url).searchParams.get("dani") ?? "1");
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Period može biti 1, 7 ili 30 dana." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoWaiterStats(sesija.ime, Number(rezultat.data)));
    } catch (error) {
      console.error("Probna statistika konobara nije uspjela:", error);
      return NextResponse.json({ greska: "Probnu statistiku nije moguće učitati." }, { status: 500 });
    }
  }
  const doDatuma = new Date();
  const odDatuma = new Date(doDatuma);
  odDatuma.setDate(odDatuma.getDate() - Number(rezultat.data));
  const { data, error } = await supabase
    .from("naplate")
    .select("ukupno, baksis, nacin, kreirano_at")
    .eq("naplatio_ime", sesija.ime)
    .gte("kreirano_at", odDatuma.toISOString())
    .lt("kreirano_at", doDatuma.toISOString());
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
    period: Number(rezultat.data),
    ime: sesija.ime,
    brojRacuna: stavke.length,
    naplaceno: Math.round(promet * 100) / 100,
    dug: Math.round(dug * 100) / 100,
    prosjecanRacun: naplaceno.length ? Math.round((promet / naplaceno.length) * 100) / 100 : 0,
    baksis: Math.round(baksis * 100) / 100,
  });
}
