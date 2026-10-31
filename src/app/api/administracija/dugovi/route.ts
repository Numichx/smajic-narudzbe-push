import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCollectGuestDebt, demoGuestDebts } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može pregledati dugove gostiju." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoGuestDebts());
    } catch (error) {
      console.error("Učitavanje probnih dugova nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne dugove nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("racuni")
    .select("id, broj, gost_duznik, konobar_ime, zatvoren_at, naplate!inner(ukupno, kreirano_at)")
    .eq("status", "na_dug")
    .order("zatvoren_at", { ascending: true });
  if (error) {
    console.error("Učitavanje dugova gostiju nije uspjelo:", error);
    return NextResponse.json({ greska: "Dugove gostiju nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({
    dugovi: data.map((racun) => ({
      id: racun.id,
      broj: racun.broj,
      duznik: racun.gost_duznik,
      konobar: racun.konobar_ime,
      kreirano: racun.zatvoren_at,
      iznos: Number(racun.naplate[0]?.ukupno ?? 0),
    })),
  });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može evidentirati naplatu duga." }, { status: 403 });
  }
  const schema = z.object({
    racunId: z.string().uuid(),
    nacin: z.enum(["gotovina", "kartica"]),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Podaci naplate duga nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ naplata: await demoCollectGuestDebt({
        billId: rezultat.data.racunId, method: rezultat.data.nacin, actor: sesija.ime,
      }) });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Naplata duga nije uspjela." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("naplati_dug_gosta", {
    p_racun_id: rezultat.data.racunId,
    p_nacin: rezultat.data.nacin,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Naplata duga nije uspjela:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ naplata: data });
}
