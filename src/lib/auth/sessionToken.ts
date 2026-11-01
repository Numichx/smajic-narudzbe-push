import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isUlogaZaposlenika,
  type SesijaZaposlenika,
} from "./session";

type PotpisanaSesija = SesijaZaposlenika & {
  istice: number;
};

const TRAJANJE_SESIJE_SEKUNDE = 60 * 60 * 12;

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

  const ocekivaniPotpis = potpis(payload, tajna);
  const datiBytes = Buffer.from(datiPotpis);
  const ocekivaniBytes = Buffer.from(ocekivaniPotpis);

  if (
    datiBytes.length !== ocekivaniBytes.length ||
    !timingSafeEqual(datiBytes, ocekivaniBytes)
  ) {
    return null;
  }

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
