import { provjeriIznos, zaokruziNaFening } from "./iznos";

export function izracunajOcekivanuGotovinu(
  pocetniIznos: number,
  gotovinskeNaplata: number[],
  isplate: number[],
): number {
  provjeriIznos(pocetniIznos, "Početni iznos");
  const naplate = gotovinskeNaplata.reduce(
    (suma, iznos) => suma + provjeriIznos(iznos, "Gotovinska naplata"),
    pocetniIznos,
  );
  const ukupneIsplate = isplate.reduce(
    (suma, iznos) => suma + provjeriIznos(iznos, "Isplata"),
    0,
  );

  return zaokruziNaFening(naplate - ukupneIsplate);
}
