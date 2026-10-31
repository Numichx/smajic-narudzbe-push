import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDemoSeed } from "./store";

describe("probni meni", () => {
  it("učitava svih 18 kategorija i artikle menija iz početnog SQL seed-a", async () => {
    const seed = await readFile(path.join(process.cwd(), "supabase", "seed.sql"), "utf8");
    const meni = parseDemoSeed(seed);

    expect(meni.kategorije).toHaveLength(18);
    expect(meni.proizvodi.length).toBeGreaterThanOrEqual(80);
    expect(meni.proizvodi.some((proizvod) => proizvod.naziv === "Jagnjetina s ražnja" && proizvod.cijena === 50)).toBe(true);
    expect(meni.proizvodi.some((proizvod) => proizvod.stanica === "sank")).toBe(true);
  });
});
