type StavkaZaStampu = {
  naziv: string;
  kolicina: number;
  ukupno: number;
};

type RacunZaStampu = {
  nazivRestorana: string;
  brojRacuna: string;
  stavke: StavkaZaStampu[];
  ukupno: number;
};

export function formatirajRacun58mm(racun: RacunZaStampu): string {
  const stavke = racun.stavke.map(
    ({ naziv, kolicina, ukupno }) =>
      `${kolicina} x ${naziv}  ${ukupno.toFixed(2)} KM`,
  );

  return [
    racun.nazivRestorana,
    `Račun: ${racun.brojRacuna}`,
    "------------------------------",
    ...stavke,
    "------------------------------",
    `UKUPNO: ${racun.ukupno.toFixed(2)} KM`,
  ].join("\n");
}
