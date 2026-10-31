import Dexie, { type Table } from "dexie";

export type OfflineAkcija = {
  id?: number;
  kreirano: number;
  tip: "narudzba";
  podaci: Record<string, unknown>;
};

class SmajicOfflineBaza extends Dexie {
  akcije!: Table<OfflineAkcija, number>;

  constructor() {
    super("smajic-offline");
    this.version(1).stores({ akcije: "++id,kreirano" });
  }
}

const baza = new SmajicOfflineBaza();

export async function dodajOfflineAkciju(
  akcija: Omit<OfflineAkcija, "id" | "kreirano">,
): Promise<number> {
  return baza.akcije.add({ ...akcija, kreirano: Date.now() });
}

export async function procitajOfflineAkcije(): Promise<OfflineAkcija[]> {
  return baza.akcije.orderBy("kreirano").toArray();
}

export async function ukloniOfflineAkciju(id: number): Promise<void> {
  await baza.akcije.delete(id);
}

export async function brojOfflineAkcija(): Promise<number> {
  return baza.akcije.count();
}
