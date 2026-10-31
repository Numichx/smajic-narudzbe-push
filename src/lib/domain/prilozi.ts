import { provjeriIznos, zaokruziNaFening } from "./iznos";

export function cijenaSaPrilozima(
  osnovnaCijena: number,
  cijenePriloga: number[],
): number {
  provjeriIznos(osnovnaCijena, "Osnovna cijena");
  const ukupno = cijenePriloga.reduce(
    (suma, cijena) => suma + provjeriIznos(cijena, "Cijena priloga"),
    osnovnaCijena,
  );

  return zaokruziNaFening(ukupno);
}
