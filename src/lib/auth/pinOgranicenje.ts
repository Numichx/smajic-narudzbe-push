import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  TRAJANJE_UREDJAJA_SEKUNDE,
  kreirajTokenUredjaja,
  procitajTokenUredjaja,
} from "@/lib/auth/sessionToken";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminKlijent = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const KOLACIC_UREDJAJA = "uredjaj";

/** Odakle dolazi PIN pokušaj: IP adresa i oznaka uređaja koji se već prijavljivao. */
export type IzvorPokusaja = { ip: string; uredjaj: string | null };

/** IP adresa klijenta; na Vercelu je postavlja sama platforma. */
export function ipKlijenta(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const prvi = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return prvi || "nepoznat";
}

export async function izvorPokusaja(request: Request): Promise<IzvorPokusaja> {
  const cookieStore = await cookies();
  return {
    ip: ipKlijenta(request),
    uredjaj: procitajTokenUredjaja(cookieStore.get(KOLACIC_UREDJAJA)?.value),
  };
}

/**
 * Uređaj koji se uspješno prijavio postaje poznat: dalje zaključava samo sebe,
 * pa ga ne mogu zaključati ni greške drugih uređaja na istom ruteru ni pokušaji
 * s interneta. Oznaka ostaje i nakon odjave.
 */
export async function zapamtiUredjaj(): Promise<void> {
  const cookieStore = await cookies();
  if (procitajTokenUredjaja(cookieStore.get(KOLACIC_UREDJAJA)?.value)) return;
  const token = kreirajTokenUredjaja();
  if (!token) return;
  cookieStore.set(KOLACIC_UREDJAJA, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRAJANJE_UREDJAJA_SEKUNDE,
  });
}

function minute(sekunde: number): string {
  const m = Math.max(1, Math.ceil(sekunde / 60));
  return m === 1 ? "1 minutu" : `${m} minuta`;
}

/**
 * Ako je PIN prijava trenutno zaključana zbog previše pogrešnih pokušaja,
 * vraća odgovor 429 (ili 503 ako provjera ne uspije); inače null.
 */
export async function provjeriOgranicenjePina(
  supabase: AdminKlijent,
  izvor: IzvorPokusaja,
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("provjeri_ogranicenje_pina", {
    p_ip: izvor.ip,
    p_uredjaj: izvor.uredjaj,
  });
  if (error) {
    console.error("Provjera ograničenja PIN-a nije uspjela:", error);
    return NextResponse.json(
      { greska: "PIN trenutno nije moguće provjeriti." },
      { status: 503 },
    );
  }
  const sekunde = typeof data === "number" ? data : 0;
  if (sekunde > 0) {
    return NextResponse.json(
      { greska: `Previše pogrešnih pokušaja. Pokušajte ponovo za ${minute(sekunde)}.` },
      { status: 429, headers: { "Retry-After": String(sekunde) } },
    );
  }
  return null;
}

/** Bilježi ishod PIN pokušaja; greška se samo zapisuje u log. */
export async function zabiljeziPinPokusaj(
  supabase: AdminKlijent,
  izvor: IzvorPokusaja,
  uspjesan: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("zabiljezi_pin_pokusaj", {
    p_ip: izvor.ip,
    p_uspjesan: uspjesan,
    p_uredjaj: izvor.uredjaj,
  });
  if (error) {
    console.error("Bilježenje PIN pokušaja nije uspjelo:", error);
  }
}
