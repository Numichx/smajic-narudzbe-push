import { NextResponse, type NextRequest } from "next/server";
import { isUlogaZaposlenika, type UlogaZaposlenika } from "./auth/session";
import { procitajTokenSesije } from "./auth/sessionToken";
import { resolveSupabaseRuntimeConfiguration } from "./supabase/config";

/** Uloga koju stranica traži (npr. /kuhinja → kuhinja); null za javne stranice i API. */
export function ulogaStranice(pathname: string): UlogaZaposlenika | null {
  const prviDio = pathname.split("/")[1] ?? "";
  return isUlogaZaposlenika(prviDio) ? prviDio : null;
}

/**
 * Proxy za svaki zahtjev:
 * 1. bez potpune Supabase konfiguracije aplikacija jasno javlja grešku (503);
 * 2. stranicu uloge (npr. /sefica) otvara samo prijavljena osoba te uloge,
 *    ostali idu na prijavu. API rute same provjeravaju sesiju i ulogu, pa ovo
 *    nije jedina zaštita podataka, nego dodatni sloj za stranice.
 *
 * Aplikacija ne koristi Supabase Auth, pa proxy više ne osvježava Supabase
 * sesiju pri svakom zahtjevu.
 */
export async function zastitiZahtjev(request: NextRequest) {
  const configuration = resolveSupabaseRuntimeConfiguration();

  if (configuration.mode === "misconfigured") {
    return NextResponse.json(
      { greska: configuration.message },
      { status: 503 },
    );
  }

  const uloga = ulogaStranice(request.nextUrl.pathname);
  if (uloga) {
    const sesija = procitajTokenSesije(request.cookies.get("sesija")?.value);
    if (sesija?.uloga !== uloga) {
      const prijava = new URL("/login", request.url);
      prijava.searchParams.set("uloga", uloga);
      return NextResponse.redirect(prijava);
    }
  }

  return NextResponse.next();
}
