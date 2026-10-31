// Standardni (besplatni) prilozi po jelima prema jelovniku restorana.
// Ista pravila provjerava SQL funkcija public.posalji_narudzbu; promjene
// ovdje moraju pratiti i novu migraciju te funkcije.

export type Jelo = { kategorija_id: string; naziv: string };

type Pravilo = {
  /** Nazivi priloga (malim slovima); stari nazivi ostaju radi postojećih podataka. */
  dozvoljeni: readonly string[];
  /** Da li se prvi dostupni dozvoljeni prilog unaprijed bira u narudžbi. */
  unaprijedOdabran: boolean;
};

const BEZ_PRILOGA: Pravilo = { dozvoljeni: [], unaprijedOdabran: false };

function normalizuj(tekst: string) {
  return tekst.normalize("NFC").toLocaleLowerCase("bs");
}

export function praviloPriloga(jelo: Jelo): Pravilo {
  const naziv = normalizuj(jelo.naziv);
  switch (jelo.kategorija_id) {
    case "jela-po-narudzbi":
    case "piletina":
      return naziv.includes("mućkalica")
        ? BEZ_PRILOGA
        : { dozvoljeni: ["pomfrit"], unaprijedOdabran: true };
    case "kuhana-jela":
      if (naziv.startsWith("lešo teletina")) {
        return { dozvoljeni: ["miješano povrće", "povrće"], unaprijedOdabran: true };
      }
      if (naziv.startsWith("gulaš")) {
        return { dozvoljeni: ["pire krompir", "pire", "riža", "makaroni"], unaprijedOdabran: false };
      }
      return BEZ_PRILOGA;
    case "riba":
      return { dozvoljeni: ["pomfrit", "krompir salata"], unaprijedOdabran: true };
    case "pecenja":
      return naziv.includes("teletina ispod sača")
        ? { dozvoljeni: ["pekarski krompir", "pomfrit"], unaprijedOdabran: true }
        : BEZ_PRILOGA;
    case "rostilj":
      return naziv.includes("ćevap") || naziv.includes("sudžuk")
        ? BEZ_PRILOGA
        : { dozvoljeni: ["pomfrit"], unaprijedOdabran: true };
    default:
      return BEZ_PRILOGA;
  }
}

export function jeBesplatanPrilog(jelo: Jelo, nazivPriloga: string): boolean {
  return praviloPriloga(jelo).dozvoljeni.includes(normalizuj(nazivPriloga));
}

export function podrazumijevaniPrilog<T extends { naziv: string }>(
  jelo: Jelo,
  prilozi: readonly T[],
): T | undefined {
  const pravilo = praviloPriloga(jelo);
  if (!pravilo.unaprijedOdabran) return undefined;
  for (const naziv of pravilo.dozvoljeni) {
    const prilog = prilozi.find((stavka) => normalizuj(stavka.naziv) === naziv);
    if (prilog) return prilog;
  }
  return undefined;
}
