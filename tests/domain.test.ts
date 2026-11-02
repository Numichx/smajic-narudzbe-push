import { describe, expect, it } from "vitest";
import { procitajPeriod } from "../src/lib/api/period";
import { kolicinaPriloga } from "../src/lib/domain/besplatniPrilozi";
import { izracunajNaplatu, moguciKusur } from "../src/lib/domain/naplata";
import { izracunajPopisPecenjare } from "../src/lib/domain/pecenjara";
import { pocetakPerioda } from "../src/lib/domain/period";
import { izracunajUkupno, racunSpremanZaNaplatu } from "../src/lib/domain/racun";
import { izracunajStanjeZalihe } from "../src/lib/domain/zaliha";

describe("domenske formule", () => {
  it("računa zbir stavki računa i zaokružuje na fening", () => {
    expect(
      izracunajUkupno([
        { cijena: 2.25, kolicina: 2 },
        { cijena: 1.1, kolicina: 1 },
      ]),
    ).toBe(5.6);
  });

  it("računa preostali dug ili kusur", () => {
    expect(izracunajNaplatu(10, 7)).toEqual({ preostalo: 3, kusur: 0 });
    expect(izracunajNaplatu(10, 12)).toEqual({ preostalo: 0, kusur: 2 });
  });

  it("tačan kusur nije odbijen zbog zaokruživanja", () => {
    for (const [ukupno, dao, kusur] of [
      [17.3, 20, 2.7],
      [18.6, 20, 1.4],
      [16.1, 20, 3.9],
      [93.7, 100, 6.3],
      [47.8, 50, 2.2],
    ]) {
      expect(moguciKusur(ukupno, dao)).toBe(kusur);
    }
    expect(moguciKusur(30, 20)).toBe(0);
  });

  it("potpuno stornirana narudžba ne blokira naplatu", () => {
    const izdata = { status: "Izdato", stavke_narudzbe: [{ stornirano: false }] };
    const uPripremi = { status: "U pripremi", stavke_narudzbe: [{ stornirano: false }, { stornirano: true }] };
    const stornirana = { status: "Novo", stavke_narudzbe: [{ stornirano: true }] };
    expect(racunSpremanZaNaplatu([izdata, stornirana])).toBe(true);
    expect(racunSpremanZaNaplatu([stornirana])).toBe(true);
    expect(racunSpremanZaNaplatu([izdata, uPripremi])).toBe(false);
    expect(racunSpremanZaNaplatu([])).toBe(false);
  });

  it("prilog uz jelo na kilograme je jedna porcija", () => {
    expect(kolicinaPriloga("kg", 0.3)).toBe(1);
    expect(kolicinaPriloga("porcija", 2)).toBe(2);
  });

  it("danas počinje od lokalne ponoći, a ne prije 24 sata", () => {
    const sada = new Date(2026, 10, 2, 15, 30);
    expect(new Date(pocetakPerioda(1, sada))).toEqual(new Date(2026, 10, 2));
    expect(new Date(pocetakPerioda(7, sada))).toEqual(new Date(2026, 9, 27));
  });

  it("prihvata samo razuman period izvještaja", () => {
    const sada = new Date("2026-11-02T14:00:00Z");
    const url = (upit: string) => `http://localhost/api/izvjestaji?${upit}`;
    expect(procitajPeriod(url("dani=1&od=2026-11-01T23:00:00.000Z"), sada)).toEqual({
      dani: 1,
      od: "2026-11-01T23:00:00.000Z",
      do: "2026-11-02T14:00:00.000Z",
    });
    expect(procitajPeriod(url("dani=1"), sada)).toBeNull();
    expect(procitajPeriod(url("dani=2&od=2026-11-01T23:00:00.000Z"), sada)).toBeNull();
    expect(procitajPeriod(url("dani=1&od=2026-01-01T00:00:00.000Z"), sada)).toBeNull();
  });

  it("računa stanje zalihe nakon prijema i utroška", () => {
    expect(izracunajStanjeZalihe(8, 5, 3)).toBe(10);
  });

  it("odbija negativne iznose računa", () => {
    expect(() => izracunajUkupno([{ cijena: -1, kolicina: 1 }])).toThrow(
      RangeError,
    );
  });

  it("računa pazar pečenjare po prodanim kokama i kilogramima janjetine", () => {
    expect(
      izracunajPopisPecenjare({
        pocetneKokePecene: 2,
        pocetneKokeSirove: 3,
        dodatneKoke: 1,
        preostaleKoke: 2,
        pocetnaJanjetinaKg: 8,
        dodatnaJanjetinaKg: 2.5,
        preostalaJanjetinaKg: 3.25,
        predaniPazar: 250,
      }),
    ).toEqual({
      prodaneKoke: 4,
      prodanaJanjetinaKg: 7.25,
      pazarPoPopisu: 418.5,
      razlika: -168.5,
    });
  });

  it("odbija popis s više preostale robe nego početne i dodatne količine", () => {
    expect(() =>
      izracunajPopisPecenjare({
        pocetneKokePecene: 0,
        pocetneKokeSirove: 0,
        dodatneKoke: 0,
        preostaleKoke: 1,
        pocetnaJanjetinaKg: 0,
        dodatnaJanjetinaKg: 0,
        preostalaJanjetinaKg: 0,
        predaniPazar: 0,
      }),
    ).toThrow(RangeError);
  });

  it("zaokružuje količinu janjetine na gram i predani pazar na fening", () => {
    expect(
      izracunajPopisPecenjare({
        pocetneKokePecene: 0,
        pocetneKokeSirove: 0,
        dodatneKoke: 0,
        preostaleKoke: 0,
        pocetnaJanjetinaKg: 1.2346,
        dodatnaJanjetinaKg: 0,
        preostalaJanjetinaKg: 0,
        predaniPazar: 61.734,
      }),
    ).toEqual({
      prodaneKoke: 0,
      prodanaJanjetinaKg: 1.235,
      pazarPoPopisu: 61.75,
      razlika: -0.02,
    });
  });
});

describe("popust na račun", () => {
  it("računa iznos nakon popusta na fening", async () => {
    const { primijeniPopust } = await import("../src/lib/domain/racun");
    expect(primijeniPopust(17.3, 10)).toBe(15.57);
    expect(primijeniPopust(17.3, 100)).toBe(0);
    expect(primijeniPopust(17.3, 0)).toBe(17.3);
    expect(() => primijeniPopust(10, 101)).toThrow(RangeError);
  });
});
