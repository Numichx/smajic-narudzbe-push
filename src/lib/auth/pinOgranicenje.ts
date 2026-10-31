import { NextResponse } from "next/server";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AdminKlijent = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

/** IP adresa klijenta; na Vercelu je postavlja sama platforma. */
export function ipKlijenta(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const prvi = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return prvi || "nepoznat";
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
  ip: string,
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("provjeri_ogranicenje_pina", { p_ip: ip });
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
  ip: string,
  uspjesan: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("zabiljezi_pin_pokusaj", {
    p_ip: ip,
    p_uspjesan: uspjesan,
  });
  if (error) {
    console.error("Bilježenje PIN pokušaja nije uspjelo:", error);
  }
}
