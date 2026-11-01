import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { kreirajTokenSesije } from "./auth/sessionToken";
import { ulogaStranice, zastitiZahtjev } from "./middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

function lokalniDemo() {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SESSION_SECRET", "test-session-secret");
}

function zahtjevSaSesijom(putanja: string, token: string | null) {
  return new NextRequest(`http://localhost${putanja}`, {
    headers: token ? { cookie: `sesija=${token}` } : {},
  });
}

describe("proxy", () => {
  it("prepoznaje stranice uloga", () => {
    expect(ulogaStranice("/sefica")).toBe("sefica");
    expect(ulogaStranice("/konobar/stolovi/4")).toBe("konobar");
    expect(ulogaStranice("/")).toBeNull();
    expect(ulogaStranice("/login")).toBeNull();
    expect(ulogaStranice("/api/narudzbe")).toBeNull();
  });

  it("propušta javne stranice i API bez sesije", async () => {
    lokalniDemo();

    expect((await zastitiZahtjev(zahtjevSaSesijom("/", null))).status).toBe(200);
    expect((await zastitiZahtjev(zahtjevSaSesijom("/login?uloga=konobar", null))).status).toBe(200);
    // API rute same provjeravaju sesiju i vraćaju 401/403.
    expect((await zastitiZahtjev(zahtjevSaSesijom("/api/meni", null))).status).toBe(200);
  });

  it("šalje na prijavu kada nema sesije za stranicu uloge", async () => {
    lokalniDemo();

    const odgovor = await zastitiZahtjev(zahtjevSaSesijom("/sefica/izvjestaj", null));

    expect(odgovor.status).toBe(307);
    expect(odgovor.headers.get("location")).toBe("http://localhost/login?uloga=sefica");
  });

  it("šalje na prijavu kada je sesija druge uloge ili izmijenjena", async () => {
    lokalniDemo();
    const kuhinja = kreirajTokenSesije({ id: "k-1", ime: "Kuhinja", uloga: "kuhinja" });

    expect((await zastitiZahtjev(zahtjevSaSesijom("/sefica", kuhinja))).status).toBe(307);
    expect((await zastitiZahtjev(zahtjevSaSesijom("/kuhinja", `${kuhinja}x`))).status).toBe(307);
  });

  it("propušta prijavljenu osobu na stranice njene uloge", async () => {
    lokalniDemo();
    const konobar = kreirajTokenSesije({ id: "z-1", ime: "Emir", uloga: "konobar", licni: true });

    expect((await zastitiZahtjev(zahtjevSaSesijom("/konobar/stolovi", konobar))).status).toBe(200);
  });

  it("vraća jasnu 503 grešku za nepotpunu Supabase konfiguraciju", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await zastitiZahtjev(
      new NextRequest("http://localhost/api/meni"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      greska: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY"),
    });
  });
});
