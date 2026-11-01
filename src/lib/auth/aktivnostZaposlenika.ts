import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Rezultat provjere se kratko pamti da svaki API poziv (npr. osvježavanje
// stanice svake 3 s) ne ide u bazu. Deaktivirani zaposlenik gubi pristup
// najkasnije nakon ovog vremena.
const TRAJANJE_PAMCENJA_MS = 30_000;
const zapamceno = new Map<string, { aktivan: boolean; vaziDo: number }>();

/**
 * Da li je zaposlenik i dalje aktivan. Kada šefica deaktivira zaposlenika,
 * njegova lična sesija prestaje važiti, iako potpisani kolačić još nije istekao.
 */
export async function zaposlenikJeAktivan(id: string): Promise<boolean> {
  const sada = Date.now();
  const zapis = zapamceno.get(id);
  if (zapis && zapis.vaziDo > sada) return zapis.aktivan;

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    // Nepotpunu konfiguraciju već prijavljuje proxy (503).
    return true;
  }
  // Lokalni demo režim nema tabelu zaposlenika u bazi.
  if (!supabase) return true;

  const { data, error } = await supabase
    .from("zaposlenici")
    .select("aktivan")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // Prolazna greška baze ne smije odjaviti cijelo osoblje usred smjene;
    // sama radnja koja slijedi ionako zavisi od baze.
    console.error("Provjera aktivnosti zaposlenika nije uspjela:", error);
    return true;
  }

  const aktivan = data?.aktivan === true;
  zapamceno.set(id, { aktivan, vaziDo: sada + TRAJANJE_PAMCENJA_MS });
  return aktivan;
}
