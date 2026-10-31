import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const kolacici = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (ime: string) => {
      const value = kolacici.get(ime);
      return value === undefined ? undefined : { name: ime, value };
    },
    set: (ime: string, value: string) => {
      kolacici.set(ime, value);
    },
  }),
}));

let privremeniDirektorij: string | undefined;

beforeEach(async () => {
  kolacici.clear();
  privremeniDirektorij = await mkdtemp(path.join(os.tmpdir(), "smajic-api-"));
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SMAJIC_DEMO_DATA_FILE", path.join(privremeniDirektorij, "state.json"));
  vi.resetModules();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  if (privremeniDirektorij) {
    await rm(privremeniDirektorij, { recursive: true, force: true });
    privremeniDirektorij = undefined;
  }
});

function zahtjev(tijelo: unknown) {
  return new Request("http://localhost/api/pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tijelo),
  });
}

describe("API prijave i obavijesti konobara", () => {
  it("prijavljuje evidentiranog konobara njegovim ličnim PIN-om", async () => {
    const demo = await import("../src/lib/demo/store");
    const { POST } = await import("../src/app/api/pin/route");
    await demo.demoSaveEmployee({ ime: "Emir", uloga: "konobar", pin: "5678" });

    const bezPina = await POST(zahtjev({ uloga: "konobar", ime: "Emir", pin: "" }));
    expect(bezPina.status).toBe(401);

    const saPinom = await POST(zahtjev({ uloga: "konobar", ime: "Emir", pin: "5678" }));
    expect(saPinom.status).toBe(200);
    expect(kolacici.get("sesija")).toBeTruthy();
  });

  it("prihvata vrijeme obavijesti sa vremenskom zonom kakvo vraća baza", async () => {
    const { POST } = await import("../src/app/api/pin/route");
    const { GET } = await import("../src/app/api/konobar/obavijesti/route");
    const prijava = await POST(zahtjev({ uloga: "konobar", ime: "Emir", pin: "" }));
    expect(prijava.status).toBe(200);

    for (const od of ["2026-10-31T03:45:15.123456+00:00", "2026-10-31T03:45:15.123Z"]) {
      const url = new URL("http://localhost/api/konobar/obavijesti");
      url.searchParams.set("od", od);
      const odgovor = await GET(new Request(url));
      expect(odgovor.status).toBe(200);
    }
  });
});
