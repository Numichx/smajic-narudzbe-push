import type { PostgrestError } from "@supabase/supabase-js";

// Supabase vraća najviše 1000 redova po upitu (max_rows), pa se zbirovi iz duže
// historije računaju iz redova pročitanih po stranicama. Upit mora imati stalan
// redoslijed (order) da se redovi ne bi ponavljali ili preskakali.
const VELICINA_STRANICE = 1000;

export async function sviRedovi<T>(
  upit: (odReda: number, doReda: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<{ data: T[]; error: null } | { data: null; error: PostgrestError }> {
  const redovi: T[] = [];
  for (let odReda = 0; ; odReda += VELICINA_STRANICE) {
    const { data, error } = await upit(odReda, odReda + VELICINA_STRANICE - 1);
    if (error) return { data: null, error };
    redovi.push(...(data ?? []));
    if (!data || data.length < VELICINA_STRANICE) return { data: redovi, error: null };
  }
}
