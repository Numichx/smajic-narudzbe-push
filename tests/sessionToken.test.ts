import { afterEach, describe, expect, it, vi } from "vitest";
import {
  kreirajTokenSesije,
  procitajTokenSesije,
} from "../src/lib/auth/sessionToken";

describe("potpisane sesije", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("kreira sesiju koja se može provjeriti", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    const token = kreirajTokenSesije({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
    });

    expect(token).not.toBeNull();
    expect(procitajTokenSesije(token ?? undefined)).toEqual({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
    });
  });

  it("odbija izmijenjen token", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    const token = kreirajTokenSesije({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
    });

    expect(procitajTokenSesije(`${token}izmijenjeno`)).toBeNull();
  });

  it("odbija isteklu sesiju", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-27T00:00:00Z"));
    const token = kreirajTokenSesije({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
    });
    vi.advanceTimersByTime(13 * 60 * 60 * 1000);

    expect(procitajTokenSesije(token ?? undefined)).toBeNull();
  });

  it("ne izdaje sesiju u produkciji bez tajne", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");

    expect(
      kreirajTokenSesije({
        id: "zaposlenik-1",
        ime: "Emir",
        uloga: "konobar",
      }),
    ).toBeNull();
  });

  it("čuva oznaku lične prijave zaposlenika", () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
    const token = kreirajTokenSesije({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
      licni: true,
    });

    expect(procitajTokenSesije(token ?? undefined)).toEqual({
      id: "zaposlenik-1",
      ime: "Emir",
      uloga: "konobar",
      licni: true,
    });
  });
});
