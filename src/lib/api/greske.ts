type GreskaBaze = { code?: string | null; message?: string | null } | null | undefined;

const OPSTA_PORUKA = "Radnja nije uspjela. Pokušajte ponovo.";

/**
 * Poruka greške koja smije otići do preglednika.
 *
 * Naše SQL funkcije javljaju poslovne greške sa `raise exception` (SQLSTATE
 * P0001), npr. „Nema dovoljno na stanju.” Te poruke su pisane za osoblje i
 * prikazuju se. Sve ostale greške baze (ograničenja, prava, nazivi tabela)
 * ostaju samo u logu servera, a korisnik dobija opštu poruku.
 */
export function porukaZaKorisnika(
  greska: GreskaBaze,
  zamjena: string = OPSTA_PORUKA,
): string {
  const poruka = greska?.message?.trim();
  return greska?.code === "P0001" && poruka ? poruka : zamjena;
}
