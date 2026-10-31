import { provjeriIznos } from "./iznos";

export function izracunajStanjeSanka(
  pocetnoStanje: number,
  dopune: number,
  prodano: number,
): number {
  provjeriIznos(pocetnoStanje, "Početno stanje");
  provjeriIznos(dopune, "Dopune");
  provjeriIznos(prodano, "Prodana količina");

  const stanje = pocetnoStanje + dopune - prodano;
  if (stanje < 0) {
    throw new RangeError("Prodana količina ne može biti veća od raspoložive zalihe.");
  }

  return stanje;
}
