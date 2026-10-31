import { provjeriIznos, zaokruziNaFening } from "./iznos";

export type PopisPecenjareInput = {
  pocetneKokePecene: number;
  pocetneKokeSirove: number;
  dodatneKoke: number;
  preostaleKoke: number;
  pocetnaJanjetinaKg: number;
  dodatnaJanjetinaKg: number;
  preostalaJanjetinaKg: number;
  predaniPazar: number;
};

export type PopisPecenjareResult = {
  prodaneKoke: number;
  prodanaJanjetinaKg: number;
  pazarPoPopisu: number;
  razlika: number;
};

function zaokruziNaGram(kilogrami: number) {
  return Math.round((kilogrami + Number.EPSILON) * 1000) / 1000;
}

export function izracunajCijenuPoKilogramu(
  kilogrami: number,
  cijenaPoKilogramu: number,
): number {
  provjeriIznos(kilogrami, "Težina");
  provjeriIznos(cijenaPoKilogramu, "Cijena po kilogramu");

  return zaokruziNaFening(kilogrami * cijenaPoKilogramu);
}

export function izracunajPopisPecenjare(
  unos: PopisPecenjareInput,
): PopisPecenjareResult {
  const cijeliBrojevi = [
    ["Početne pečene koke", unos.pocetneKokePecene],
    ["Početne sirove koke", unos.pocetneKokeSirove],
    ["Dodatne koke", unos.dodatneKoke],
    ["Preostale koke", unos.preostaleKoke],
  ] as const;
  for (const [naziv, vrijednost] of cijeliBrojevi) {
    if (!Number.isSafeInteger(vrijednost) || vrijednost < 0) {
      throw new RangeError(`${naziv} moraju biti cijeli nenegativni brojevi.`);
    }
  }

  const tezine = [
    ["Početna janjetina", unos.pocetnaJanjetinaKg],
    ["Dodatna janjetina", unos.dodatnaJanjetinaKg],
    ["Preostala janjetina", unos.preostalaJanjetinaKg],
  ] as const;
  for (const [naziv, vrijednost] of tezine) {
    provjeriIznos(vrijednost, naziv);
  }
  provjeriIznos(unos.predaniPazar, "Predani pazar");

  const pocetnaJanjetinaKg = zaokruziNaGram(unos.pocetnaJanjetinaKg);
  const dodatnaJanjetinaKg = zaokruziNaGram(unos.dodatnaJanjetinaKg);
  const preostalaJanjetinaKg = zaokruziNaGram(unos.preostalaJanjetinaKg);
  const predaniPazar = zaokruziNaFening(unos.predaniPazar);
  const prodaneKoke =
    unos.pocetneKokePecene +
    unos.pocetneKokeSirove +
    unos.dodatneKoke -
    unos.preostaleKoke;
  const prodanaJanjetinaKg = zaokruziNaGram(
    pocetnaJanjetinaKg + dodatnaJanjetinaKg - preostalaJanjetinaKg,
  );
  if (prodaneKoke < 0 || prodanaJanjetinaKg < 0) {
    throw new RangeError("Završno stanje je veće od raspoložive količine.");
  }

  const pazarPoPopisu = zaokruziNaFening(
    prodaneKoke * 14 + prodanaJanjetinaKg * 50,
  );
  return {
    prodaneKoke,
    prodanaJanjetinaKg,
    pazarPoPopisu,
    razlika: zaokruziNaFening(predaniPazar - pazarPoPopisu),
  };
}
