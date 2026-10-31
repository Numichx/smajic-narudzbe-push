import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoCreateReservation, demoReservations, demoSetReservationStatus } from "@/lib/demo/store";

const RezervacijaSchema = z.object({
  ime: z.string().trim().min(2).max(100),
  brojGostiju: z.number().int().positive().max(200),
  rezervisanoZa: z.string().datetime(),
  stoId: z.number().int().min(1).max(20).nullable().optional(),
  telefon: z.string().trim().max(40).optional(),
  napomena: z.string().trim().max(500).optional(),
});

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["konobar", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda rezervacija." }, { status: 403 });
  }
  const url = new URL(request.url);
  const dan = url.searchParams.get("dan") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dan)) {
    return NextResponse.json({ greska: "Datum nije ispravan." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoReservations(dan));
    } catch (error) {
      console.error("Učitavanje probnih rezervacija nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne rezervacije nije moguće učitati." }, { status: 500 });
    }
  }
  const pocetak = new Date(`${dan}T00:00:00`).toISOString();
  const kraj = new Date(`${dan}T00:00:00`);
  kraj.setDate(kraj.getDate() + 1);

  const { data, error } = await supabase
    .from("rezervacije")
    .select("id, ime, broj_gostiju, rezervisano_za, sto_id, telefon, napomena, status")
    .gte("rezervisano_za", pocetak)
    .lt("rezervisano_za", kraj.toISOString())
    .order("rezervisano_za");
  if (error) {
    console.error("Učitavanje rezervacija nije uspjelo:", error);
    return NextResponse.json({ greska: "Rezervacije nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ rezervacije: data });
}

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["konobar", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo kreiranja rezervacija." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = RezervacijaSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Podaci rezervacije nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const id = await demoCreateReservation({ ...rezultat.data, actor: sesija.ime });
      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Rezervacija nije sačuvana." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("kreiraj_rezervaciju", {
    p_ime: rezultat.data.ime,
    p_broj_gostiju: rezultat.data.brojGostiju,
    p_rezervisano_za: rezultat.data.rezervisanoZa,
    p_sto_id: rezultat.data.stoId ?? null,
    p_telefon: rezultat.data.telefon ?? null,
    p_napomena: rezultat.data.napomena ?? null,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Kreiranje rezervacije nije uspjelo:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["konobar", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo izmjene rezervacija." }, { status: 403 });
  }
  const schema = z.object({
    id: z.string().uuid(),
    status: z.enum(["realizovana", "otkazana"]),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Izmjena rezervacije nije ispravna." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      await demoSetReservationStatus(rezultat.data.id, rezultat.data.status);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Rezervacija nije izmijenjena." }, { status: 422 });
    }
  }
  const { error } = await supabase
    .from("rezervacije")
    .update({ status: rezultat.data.status })
    .eq("id", rezultat.data.id)
    .eq("status", "aktivna");
  if (error) {
    console.error("Promjena rezervacije nije uspjela:", error);
    return NextResponse.json({ greska: "Rezervaciju nije moguće izmijeniti." }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
