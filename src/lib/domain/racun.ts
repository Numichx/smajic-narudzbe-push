import { provjeriIznos, zaokruziNaFening } from "./iznos";

export type StavkaRacuna = {
  cijena: number;
  kolicina: number;
};

type NarudzbaRacuna = {
  status: string;
  stavke_narudzbe: { stornirano: boolean }[];
};

/**
 * Račun se može naplatiti kad su sve narudžbe izdate. Potpuno stornirana
 * narudžba više ne čeka stanicu i ne smije blokirati zatvaranje stola.
 */
export function racunSpremanZaNaplatu(narudzbe: NarudzbaRacuna[]): boolean {
  return narudzbe.length > 0 && narudzbe.every((narudzba) =>
    narudzba.status === "Izdato" ||
    narudzba.stavke_narudzbe.every((stavka) => stavka.stornirano));
}

export function izracunajUkupno(stavke: StavkaRacuna[]): number {
  const ukupno = stavke.reduce((suma, stavka) => {
    provjeriIznos(stavka.cijena, "Cijena");
    provjeriIznos(stavka.kolicina, "Količina");
    return suma + stavka.cijena * stavka.kolicina;
  }, 0);

  return zaokruziNaFening(ukupno);
}
