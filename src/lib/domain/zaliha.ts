import { provjeriIznos } from "./iznos";

export function izracunajStanjeZalihe(
  pocetnoStanje: number,
  primljeno: number,
  utroseno: number,
): number {
  provjeriIznos(pocetnoStanje, "Početno stanje");
  provjeriIznos(primljeno, "Primljena količina");
  provjeriIznos(utroseno, "Utrošena količina");
  return pocetnoStanje + primljeno - utroseno;
}
