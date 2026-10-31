export function provjeriIznos(iznos: number, naziv = "Iznos"): number {
  if (!Number.isFinite(iznos) || iznos < 0) {
    throw new RangeError(`${naziv} mora biti konačan nenegativan broj.`);
  }

  return iznos;
}

export function zaokruziNaFening(iznos: number): number {
  return Math.round((iznos + Number.EPSILON) * 100) / 100;
}
