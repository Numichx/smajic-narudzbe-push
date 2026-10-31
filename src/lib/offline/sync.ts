import {
  procitajOfflineAkcije,
  ukloniOfflineAkciju,
  type OfflineAkcija,
} from "./queue";

export async function sinhronizujOfflineRed(
  obradi: (akcija: OfflineAkcija) => Promise<void>,
): Promise<number> {
  const akcije = await procitajOfflineAkcije();
  let sinhronizovano = 0;

  for (const akcija of akcije) {
    if (akcija.id === undefined) {
      throw new Error("Offline akcija nema identifikator.");
    }

    await obradi(akcija);
    await ukloniOfflineAkciju(akcija.id);
    sinhronizovano += 1;
  }

  return sinhronizovano;
}

export async function sinhronizujNarudzbe(): Promise<number> {
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
      throw new Error(body?.greska ?? "Offline narudžba nije sinhronizovana.");
    }
  });
}
