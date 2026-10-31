export const ULOGE_ZAPOSLENIKA = [
  "konobar",
  "kuhinja",
  "pecenjara",
  "sank",
  "mesnica",
  "sefica",
] as const;

export type UlogaZaposlenika = (typeof ULOGE_ZAPOSLENIKA)[number];

export function isUlogaZaposlenika(
  vrijednost: unknown,
): vrijednost is UlogaZaposlenika {
  return (
    typeof vrijednost === "string" &&
    ULOGE_ZAPOSLENIKA.some((uloga) => uloga === vrijednost)
  );
}

export type SesijaZaposlenika = {
  id: string;
  ime: string;
  uloga: UlogaZaposlenika;
};
