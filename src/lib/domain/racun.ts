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

export const RAZLOZI_POPUSTA = ["Obrok osoblja", "Častimo", "Stalni gost", "Reklamacija", "Drugo"] as const;

/** Iznos za naplatu nakon popusta u procentima; isto zaokruživanje kao ukupno_racuna u bazi. */
export function primijeniPopust(bruto: number, procenat: number): number {
  provjeriIznos(bruto, "Bruto iznos");
  if (!Number.isFinite(procenat) || procenat < 0 || procenat > 100) {
    throw new RangeError("Popust mora biti između 0 i 100 %.");
  }
  return zaokruziNaFening(bruto * (1 - procenat / 100));
}
