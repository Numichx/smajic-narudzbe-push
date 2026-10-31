import { provjeriIznos } from "./iznos";

export function izracunajPotrebnuNabavku(
  ciljnaKolicina: number,
  trenutnoStanje: number,
): number {
  provjeriIznos(ciljnaKolicina, "Ciljna količina");
  provjeriIznos(trenutnoStanje, "Trenutno stanje");

  return Math.max(ciljnaKolicina - trenutnoStanje, 0);
}
