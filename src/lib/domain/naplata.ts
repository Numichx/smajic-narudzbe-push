import { provjeriIznos, zaokruziNaFening } from "./iznos";

export type RezultatNaplata = {
  preostalo: number;
  kusur: number;
};

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
