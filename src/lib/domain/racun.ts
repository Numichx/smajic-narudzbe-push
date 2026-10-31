import { provjeriIznos, zaokruziNaFening } from "./iznos";

export type StavkaRacuna = {
  cijena: number;
  kolicina: number;
};

export function izracunajUkupno(stavke: StavkaRacuna[]): number {
  const ukupno = stavke.reduce((suma, stavka) => {
    provjeriIznos(stavka.cijena, "Cijena");
    provjeriIznos(stavka.kolicina, "Količina");
    return suma + stavka.cijena * stavka.kolicina;
  }, 0);

  return zaokruziNaFening(ukupno);
}
