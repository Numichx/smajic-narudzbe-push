import { describe, expect, it } from "vitest";
import {
  jeBesplatanPrilog,
  podrazumijevaniPrilog,
} from "../src/lib/domain/besplatniPrilozi";

const prilozi = [
  { naziv: "Pekarski krompir" },
  { naziv: "Pomfrit" },
  { naziv: "Pire krompir" },
  { naziv: "Miješano povrće" },
  { naziv: "Krompir salata" },
];

describe("besplatni prilozi prema jelovniku", () => {
  it("uz gulaš dozvoljava pire, rižu ili makarone bez unaprijed odabranog priloga", () => {
    const gulas = { kategorija_id: "kuhana-jela", naziv: "Gulaš" };
    expect(jeBesplatanPrilog(gulas, "Pire krompir")).toBe(true);
    expect(jeBesplatanPrilog(gulas, "Pire")).toBe(true);
    expect(jeBesplatanPrilog(gulas, "Pomfrit")).toBe(false);
    expect(podrazumijevaniPrilog(gulas, prilozi)).toBeUndefined();
  });

  it("uz lešo teletinu unaprijed bira miješano povrće", () => {
    const leso = { kategorija_id: "kuhana-jela", naziv: "Lešo teletina" };
    expect(podrazumijevaniPrilog(leso, prilozi)?.naziv).toBe("Miješano povrće");
    expect(jeBesplatanPrilog(leso, "Povrće")).toBe(true);
  });

  it("ćevapi i sudžukice nemaju besplatan prilog, ostali roštilj ima pomfrit", () => {
    expect(jeBesplatanPrilog({ kategorija_id: "rostilj", naziv: "Ćevapi – mala porcija" }, "Pomfrit")).toBe(false);
    expect(jeBesplatanPrilog({ kategorija_id: "rostilj", naziv: "Kombinacija: 5 ćevapa + 3 sudžukice" }, "Pomfrit")).toBe(false);
    expect(podrazumijevaniPrilog({ kategorija_id: "rostilj", naziv: "Pljeskavica" }, prilozi)?.naziv).toBe("Pomfrit");
  });

  it("uz teletinu ispod sača unaprijed bira pekarski krompir, a uz porciju nema besplatnog priloga", () => {
    expect(podrazumijevaniPrilog({ kategorija_id: "pecenja", naziv: "Teletina ispod sača" }, prilozi)?.naziv)
      .toBe("Pekarski krompir");
    expect(jeBesplatanPrilog({ kategorija_id: "pecenja", naziv: "Porcija pečene teletine" }, "Pomfrit")).toBe(false);
  });
});
