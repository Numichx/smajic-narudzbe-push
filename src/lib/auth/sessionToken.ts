import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  isUlogaZaposlenika,
  type SesijaZaposlenika,
} from "./session";

type PotpisanaSesija = SesijaZaposlenika & {
  istice: number;
};

// Restoran radi od 06 do 23 sata, pa prijava s početka dana mora trajati do zatvaranja.
export const TRAJANJE_SESIJE_SEKUNDE = 60 * 60 * 18;
export const TRAJANJE_UREDJAJA_SEKUNDE = 60 * 60 * 24 * 365;

function tajnaSesije(): string | null {
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  return process.env.NODE_ENV === "development"
    ? "smajic-local-development-session-secret"
    : null;
}

function potpis(payload: string, tajna: string): string {
  return createHmac("sha256", tajna).update(payload).digest("base64url");
}

function potpisJeIspravan(payload: string, datiPotpis: string, tajna: string): boolean {
  const datiBytes = Buffer.from(datiPotpis);
  const ocekivaniBytes = Buffer.from(potpis(payload, tajna));
  return (
    datiBytes.length === ocekivaniBytes.length &&
    timingSafeEqual(datiBytes, ocekivaniBytes)
  );
}

export function kreirajTokenSesije(
  sesija: SesijaZaposlenika,
): string | null {
  const tajna = tajnaSesije();
  if (!tajna) return null;

  const payload = Buffer.from(
    JSON.stringify({
      ...sesija,
      istice: Math.floor(Date.now() / 1000) + TRAJANJE_SESIJE_SEKUNDE,
    } satisfies PotpisanaSesija),
  ).toString("base64url");

  return `${payload}.${potpis(payload, tajna)}`;
}

export function procitajTokenSesije(token: string | undefined): SesijaZaposlenika | null {
  const tajna = tajnaSesije();
  if (!tajna || !token) return null;

  const [payload, datiPotpis, ...ostalo] = token.split(".");
  if (!payload || !datiPotpis || ostalo.length > 0) return null;

  if (!potpisJeIspravan(payload, datiPotpis, tajna)) return null;

  let podaci: unknown;
  try {
    podaci = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof podaci !== "object" || podaci === null) return null;

  const kandidat = podaci as Partial<PotpisanaSesija>;
  if (
    !isUlogaZaposlenika(kandidat.uloga) ||
    typeof kandidat.id !== "string" ||
    typeof kandidat.ime !== "string" ||
    typeof kandidat.istice !== "number" ||
    kandidat.istice <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    id: kandidat.id,
    ime: kandidat.ime,
    uloga: kandidat.uloga,
    ...(kandidat.licni === true ? { licni: true as const } : {}),
  };
}

/** Potpisana oznaka uređaja koji se uspješno prijavio; vidi pinOgranicenje.ts. */
export function kreirajTokenUredjaja(): string | null {
  const tajna = tajnaSesije();
  if (!tajna) return null;
  const id = randomUUID();
  return `${id}.${potpis(`uredjaj:${id}`, tajna)}`;
}

export function procitajTokenUredjaja(token: string | undefined): string | null {
  const tajna = tajnaSesije();
  if (!tajna || !token) return null;
  const [id, datiPotpis, ...ostalo] = token.split(".");
  if (!id || !datiPotpis || ostalo.length > 0) return null;
  return potpisJeIspravan(`uredjaj:${id}`, datiPotpis, tajna) ? id : null;
}
