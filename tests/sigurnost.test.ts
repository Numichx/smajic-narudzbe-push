import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { porukaZaKorisnika } from "../src/lib/api/greske";

const maybeSingle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));

describe("poruke grešaka za korisnika", () => {
  it("prikazuje poslovne poruke iz SQL funkcija", () => {
    expect(
      porukaZaKorisnika({ code: "P0001", message: "Nema dovoljno na stanju." }),
    ).toBe("Nema dovoljno na stanju.");
  });

  it("skriva tehničke greške baze", () => {
    expect(
      porukaZaKorisnika({
        code: "23514",
        message: 'new row for relation "stavke_narudzbe" violates check constraint',
      }),
    ).toBe("Radnja nije uspjela. Pokušajte ponovo.");
    expect(
      porukaZaKorisnika({ code: "42501", message: "permission denied for table racuni" }, "Zamjena"),
    ).toBe("Zamjena");
    expect(porukaZaKorisnika(null)).toBe("Radnja nije uspjela. Pokušajte ponovo.");
  });
});

describe("deaktivirani zaposlenik", () => {
  beforeEach(() => {
    vi.resetModules();
    maybeSingle.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function provjera() {
    const modul = await import("../src/lib/auth/aktivnostZaposlenika");
    return modul.zaposlenikJeAktivan;
  }

  it("gubi pristup čim ga šefica deaktivira", async () => {
    maybeSingle.mockResolvedValue({ data: { aktivan: false }, error: null });
    const zaposlenikJeAktivan = await provjera();

    await expect(zaposlenikJeAktivan("z-1")).resolves.toBe(false);
  });

  it("nepostojeći zaposlenik nema pristup", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const zaposlenikJeAktivan = await provjera();

    await expect(zaposlenikJeAktivan("z-nepoznat")).resolves.toBe(false);
  });

  it("aktivan zaposlenik zadržava pristup, a provjera se kratko pamti", async () => {
    maybeSingle.mockResolvedValue({ data: { aktivan: true }, error: null });
    const zaposlenikJeAktivan = await provjera();

    await expect(zaposlenikJeAktivan("z-2")).resolves.toBe(true);
    await expect(zaposlenikJeAktivan("z-2")).resolves.toBe(true);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("prolazna greška baze ne odjavljuje osoblje", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "timeout" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const zaposlenikJeAktivan = await provjera();

    await expect(zaposlenikJeAktivan("z-3")).resolves.toBe(true);
  });
});
