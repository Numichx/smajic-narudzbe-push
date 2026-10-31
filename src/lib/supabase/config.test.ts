import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { resolveSupabaseRuntimeConfiguration } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase runtime konfiguracija", () => {
  it("koristi probni režim samo u developmentu bez ijedne Supabase varijable", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({ NODE_ENV: "development" }),
    ).toEqual({ mode: "demo" });
  });

  it("prihvata kompletnu konfiguraciju i vraća očišćene vrijednosti", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co ",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " publishable-key ",
        SUPABASE_SERVICE_ROLE_KEY: " service-role-key ",
      }),
    ).toEqual({
      mode: "supabase",
      url: "https://example.supabase.co",
      publishableKey: "publishable-key",
      serviceRoleKey: "service-role-key",
    });
  });

  it("daje prednost SUPABASE_SECRET_KEY nad SUPABASE_SERVICE_ROLE_KEY", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        SUPABASE_SECRET_KEY: " sb_secret_key ",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toMatchObject({ mode: "supabase", serviceRoleKey: "sb_secret_key" });
  });

  it("prihvata samo SUPABASE_SECRET_KEY bez service role ključa", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
        SUPABASE_SECRET_KEY: "sb_secret_key",
      }),
    ).toMatchObject({ mode: "supabase", serviceRoleKey: "sb_secret_key" });
  });

  it("prihvata legacy anon ključ za Supabase klijente", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).toMatchObject({ mode: "supabase", publishableKey: "anon-key" });
  });

  it("odbija djelimičnu konfiguraciju umjesto demo fallbacka", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toMatchObject({
      mode: "misconfigured",
      message: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY"),
    });
  });

  it("odbija potpuno nedostajuću konfiguraciju u produkciji", () => {
    expect(
      resolveSupabaseRuntimeConfiguration({ NODE_ENV: "production" }),
    ).toMatchObject({
      mode: "misconfigured",
      message: expect.stringContaining("NEXT_PUBLIC_SUPABASE_URL"),
    });
  });

  it("vraća demo klijenta samo za lokalni development bez konfiguracije", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(createSupabaseAdminClient()).toBeNull();
  });

  it("ne prebacuje nepotpunu produkcijsku konfiguraciju na demo pohranu", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() => createSupabaseAdminClient()).toThrow(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
  });
});
