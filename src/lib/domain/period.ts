/**
 * Početak perioda po lokalnom vremenu uređaja: 1 dan je "Danas" od ponoći,
 * a 7 dana je danas i 6 prethodnih dana.
 */
export function pocetakPerioda(dani: number, sada = new Date()): string {
  return new Date(
    sada.getFullYear(),
    sada.getMonth(),
    sada.getDate() - (dani - 1),
  ).toISOString();
}
