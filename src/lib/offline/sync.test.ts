import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OfflineAkcija } from "./queue";

const red = vi.hoisted(() => ({ akcije: [] as OfflineAkcija[] }));

vi.mock("./queue", () => ({
  procitajOfflineAkcije: async () => [...red.akcije],
  ukloniOfflineAkciju: async (id: number) => {
    red.akcije = red.akcije.filter((akcija) => akcija.id !== id);
  },
}));

const { OdbijenaOfflineAkcija, sinhronizujOfflineRed } = await import("./sync");

function akcija(id: number): OfflineAkcija {
  return { id, kreirano: id, tip: "narudzba", podaci: { stoId: id } };
}

describe("offline red narudžbi", () => {
  beforeEach(() => {
    red.akcije = [akcija(1), akcija(2), akcija(3)];
  });

  it("uklanja trajno odbijenu narudžbu i nastavlja sa ostalima", async () => {
    const rezultat = await sinhronizujOfflineRed(async (stavka) => {
      if (stavka.id === 2) throw new OdbijenaOfflineAkcija("Sto 2 je odbijen.");
    });

    expect(rezultat).toEqual({ sinhronizovano: 2, odbijeno: ["Sto 2 je odbijen."] });
    expect(red.akcije).toEqual([]);
  });

  it("zadržava narudžbe u redu kod privremene greške", async () => {
    await expect(sinhronizujOfflineRed(async (stavka) => {
      if (stavka.id === 2) throw new Error("Nema veze.");
    })).rejects.toThrow("Nema veze.");

    expect(red.akcije.map((stavka) => stavka.id)).toEqual([2, 3]);
  });
});
