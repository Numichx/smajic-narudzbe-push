import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "./middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase proxy konfiguracija", () => {
  it("propušta zahtjev bez Supabase klijenta u lokalnom demo režimu", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await updateSession(
      new NextRequest("http://localhost/konobar"),
    );

    expect(response.status).toBe(200);
  });

  it("vraća jasnu 503 grešku za nepotpunu Supabase konfiguraciju", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const response = await updateSession(
      new NextRequest("http://localhost/api/meni"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      greska: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY"),
    });
  });
});
