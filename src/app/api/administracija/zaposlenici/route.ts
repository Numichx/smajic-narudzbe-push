import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoEmployees, demoSaveEmployee, demoSetEmployeeStatus } from "@/lib/demo/store";

async function dohvatiSeficu() {
  const sesija = await procitajZahtjevSesiju();
  return sesija?.uloga === "sefica" ? sesija : null;
}

export async function GET() {
  if (!await dohvatiSeficu()) {
    return NextResponse.json({ greska: "Samo šefica može upravljati osobljem." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoEmployees());
    } catch (error) {
      console.error("Učitavanje probnog osoblja nije uspjelo:", error);
      return NextResponse.json({ greska: "Probno osoblje nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("zaposlenici")
    .select("id, ime, uloga, aktivan, kreirano_at")
    .order("ime");
  if (error) {
    console.error("Učitavanje zaposlenika nije uspjelo:", error);
    return NextResponse.json({ greska: "Osoblje nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ zaposlenici: data });
}

export async function POST(request: Request) {
  if (!await dohvatiSeficu()) {
    return NextResponse.json({ greska: "Samo šefica može dodavati osoblje." }, { status: 403 });
  }
  const schema = z.object({
    id: z.string().uuid().optional(),
    ime: z.string().trim().min(2).max(80),
    uloga: z.enum(["konobar", "kuhinja", "pecenjara", "sank", "mesnica", "sefica"]),
    pin: z.string().regex(/^\d{4,8}$/),
  });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Ime, uloga ili PIN zaposlenika nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const id = await demoSaveEmployee(rezultat.data);
      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Zaposlenika nije moguće sačuvati." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("sacuvaj_zaposlenika", {
    p_ime: rezultat.data.ime,
    p_uloga: rezultat.data.uloga,
    p_pin: rezultat.data.pin,
    p_id: rezultat.data.id ?? null,
  });
  if (error) {
    console.error("Čuvanje zaposlenika nije uspjelo:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!await dohvatiSeficu()) {
    return NextResponse.json({ greska: "Samo šefica može mijenjati osoblje." }, { status: 403 });
  }
  const schema = z.object({ id: z.string().uuid(), aktivan: z.boolean() });
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) return NextResponse.json({ greska: "Izmjena zaposlenika nije ispravna." }, { status: 400 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      await demoSetEmployeeStatus(rezultat.data.id, rezultat.data.aktivan);
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Status zaposlenika nije moguće promijeniti." }, { status: 422 });
    }
  }
  const { error } = await supabase.rpc("postavi_status_zaposlenika", {
    p_id: rezultat.data.id,
    p_aktivan: rezultat.data.aktivan,
  });
  if (error) {
    console.error("Promjena statusa zaposlenika nije uspjela:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
