import {
  procitajOfflineAkcije,
  ukloniOfflineAkciju,
  type OfflineAkcija,
} from "./queue";

/** Server je trajno odbio akciju; ponovno slanje ne bi uspjelo. */
export class OdbijenaOfflineAkcija extends Error {}

export type RezultatSinhronizacije = {
  sinhronizovano: number;
  odbijeno: string[];
};

export async function sinhronizujOfflineRed(
  obradi: (akcija: OfflineAkcija) => Promise<void>,
): Promise<RezultatSinhronizacije> {
  const akcije = await procitajOfflineAkcije();
  const rezultat: RezultatSinhronizacije = { sinhronizovano: 0, odbijeno: [] };

  for (const akcija of akcije) {
    if (akcija.id === undefined) {
      throw new Error("Offline akcija nema identifikator.");
    }

    try {
      await obradi(akcija);
      rezultat.sinhronizovano += 1;
    } catch (error) {
      // Privremene greške (veza, server, istekla prijava) zaustavljaju red da se
      // akcija pokuša ponovo; trajno odbijena akcija se uklanja da ne blokira ostale.
      if (!(error instanceof OdbijenaOfflineAkcija)) throw error;
      rezultat.odbijeno.push(error.message);
    }
    await ukloniOfflineAkciju(akcija.id);
  }

  return rezultat;
}

export async function sinhronizujNarudzbe(): Promise<RezultatSinhronizacije> {
  return sinhronizujOfflineRed(async (akcija) => {
    if (akcija.tip !== "narudzba") {
      throw new Error(`Nepoznata offline akcija: ${akcija.tip}`);
    }

    const response = await fetch("/api/narudzbe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(akcija.podaci),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { greska?: string } | null;
      const poruka = body?.greska ?? "Offline narudžba nije sinhronizovana.";
      if (response.status === 400 || response.status === 422) {
        throw new OdbijenaOfflineAkcija(
          `Offline narudžba za sto ${String(akcija.podaci.stoId)} je odbijena: ${poruka}`,
        );
      }
      throw new Error(poruka);
    }
  });
}
