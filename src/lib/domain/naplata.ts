import { provjeriIznos, zaokruziNaFening } from "./iznos";

export type RezultatNaplata = {
  preostalo: number;
  kusur: number;
};

/**
 * Najveći kusur koji gost može dobiti, tačno na fening. Direktno oduzimanje ne
 * valja: 20 - 17.3 u pokretnom zarezu je 2.6999999999999993, pa bi 2,70 bilo odbijeno.
 */
export function moguciKusur(ukupno: number, gostDao: number): number {
  return Math.max(0, zaokruziNaFening(gostDao - ukupno));
}

export function izracunajNaplatu(
  ukupno: number,
  placeno: number,
): RezultatNaplata {
  provjeriIznos(ukupno, "Ukupan iznos");
  provjeriIznos(placeno, "Plaćeni iznos");

  return {
    preostalo: zaokruziNaFening(Math.max(ukupno - placeno, 0)),
    kusur: zaokruziNaFening(Math.max(placeno - ukupno, 0)),
  };
}
