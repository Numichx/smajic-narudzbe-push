import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCreateStockRequest, demoProcessStockRequest, demoStockRequests } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["mesnica", "sefica", "kuhinja"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda zahtjeva." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoStockRequests());
    } catch (error) {
      console.error("Učitavanje probnih zahtjeva nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne zahtjeve nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("zahtjevi_mesnice")
    .select("id, kolicina, izvor, status, kreirao_ime, kreirano_at, zaliha_artikli(id, naziv, jedinica, stanje, minimum)")
    .order("kreirano_at", { ascending: false });
  if (error) {
    console.error("Učitavanje zahtjeva mesnice nije uspjelo:", error);
    return NextResponse.json({ greska: "Zahtjeve nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ zahtjevi: data });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["kuhinja", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo slanja zahtjeva." }, { status: 403 });
  }
  const schema = z.object({
    zalihaId: z.string().uuid(),
    kolicina: z.number().positive().optional(),
    narudzbaId: z.string().uuid().optional(),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Zahtjev nije ispravan." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const id = await demoCreateStockRequest({
        stockId: rezultat.data.zalihaId,
        quantity: rezultat.data.kolicina,
        actor: sesija.ime,
      });
      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Zahtjev nije sačuvan." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("kreiraj_zahtjev_mesnice", {
    p_zaliha_id: rezultat.data.zalihaId,
    p_kolicina: rezultat.data.kolicina ?? null,
    p_izvor: "kuhinja",
    p_narudzba_id: rezultat.data.narudzbaId ?? null,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Slanje zahtjeva mesnici nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "mesnica") {
    return NextResponse.json({ greska: "Samo mesnica može obraditi zahtjev." }, { status: 403 });
  }
  const schema = z.discriminatedUnion("radnja", [
    z.object({
      radnja: z.literal("isporuci"),
      zahtjevId: z.string().uuid(),
      kolicina: z.number().positive(),
    }),
    z.object({ radnja: z.literal("nema_na_stanju"), zahtjevId: z.string().uuid() }),
  ]);
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Obrada zahtjeva nije ispravna." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const rezultatObrade = rezultat.data.radnja === "isporuci"
        ? await demoProcessStockRequest({
            requestId: rezultat.data.zahtjevId, action: "isporuci",
            quantity: rezultat.data.kolicina, actor: sesija.ime,
          })
        : await demoProcessStockRequest({
            requestId: rezultat.data.zahtjevId, action: "nema_na_stanju", actor: sesija.ime,
          });
      return NextResponse.json({ rezultat: rezultatObrade });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Zahtjev nije obrađen." }, { status: 422 });
    }
  }

  if (rezultat.data.radnja === "isporuci") {
    const { data, error } = await supabase.rpc("isporuci_zahtjev_mesnice", {
      p_zahtjev_id: rezultat.data.zahtjevId,
      p_kolicina: rezultat.data.kolicina,
      p_akter_ime: sesija.ime,
    });
    if (error) {
      console.error("Isporuka zahtjeva nije uspjela:", error);
      return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
    }
    return NextResponse.json({ rezultat: data });
  }

  const { data, error } = await supabase
    .from("zahtjevi_mesnice")
    .update({ status: "nema_na_stanju", isporucio_ime: sesija.ime, zavrseno_at: new Date().toISOString() })
    .eq("id", rezultat.data.zahtjevId)
    .eq("status", "nov")
    .select("id");
  if (error) {
    console.error("Zatvaranje zahtjeva nije uspjelo:", error);
    return NextResponse.json({ greska: "Zahtjev nije moguće zatvoriti." }, { status: 422 });
  }
  if (data.length === 0) {
    return NextResponse.json({ greska: "Otvoreni zahtjev nije pronađen." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
