import { z } from "zod";

const DaniSchema = z.enum(["1", "7", "30"]);
const OdSchema = z.string().datetime({ offset: true });
const DAN_MS = 24 * 60 * 60 * 1000;

export type Period = { dani: number; od: string; do: string };

/**
 * Period izvještaja iz adrese zahtjeva. Početak (`od`) šalje preglednik po svom
 * lokalnom vremenu; server je često u UTC-u, pa bi "Danas" počinjalo u pogrešan sat.
 */
export function procitajPeriod(url: string, sada = new Date()): Period | null {
  const parametri = new URL(url).searchParams;
  const dani = DaniSchema.safeParse(parametri.get("dani") ?? "1");
  const od = OdSchema.safeParse(parametri.get("od"));
  if (!dani.success || !od.success) return null;

  const brojDana = Number(dani.data);
  // Dan viška pokriva vremenske zone i ljetno računanje vremena.
  const najranije = sada.getTime() - (brojDana + 1) * DAN_MS;
  const pocetak = Date.parse(od.data);
  if (pocetak < najranije || pocetak > sada.getTime() + DAN_MS) return null;

  return { dani: brojDana, od: od.data, do: sada.toISOString() };
}
