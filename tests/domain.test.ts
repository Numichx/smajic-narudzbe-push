import { describe, expect, it } from "vitest";
import { izracunajNaplatu } from "../src/lib/domain/naplata";
import { izracunajPopisPecenjare } from "../src/lib/domain/pecenjara";
import { izracunajUkupno } from "../src/lib/domain/racun";
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
