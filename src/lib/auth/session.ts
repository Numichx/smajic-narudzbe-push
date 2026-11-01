export const ULOGE_ZAPOSLENIKA = [
  "konobar",
  "kuhinja",
  "pecenjara",
  "sank",
  "mesnica",
  "sefica",
] as const;

export type UlogaZaposlenika = (typeof ULOGE_ZAPOSLENIKA)[number];

export const NAZIVI_ULOGA: Record<UlogaZaposlenika, string> = {
  konobar: "Konobar",
  kuhinja: "Kuhinja",
  pecenjara: "Pečenjara",
  sank: "Šank",
  mesnica: "Mesnica",
  sefica: "Šefica",
};

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
  /** Prijava ličnim PIN-om zaposlenika (id je iz tabele zaposlenici), a ne PIN-om uloge. */
  licni?: true;
};
