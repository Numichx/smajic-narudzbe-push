import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { jeBesplatanPrilog } from "../domain/besplatniPrilozi";
import { izracunajPopisPecenjare } from "../domain/pecenjara";
import { resolveSupabaseRuntimeConfiguration } from "../supabase/config";

type DemoProduct = {
  id: string;
  kategorija_id: string;
  naziv: string;
  cijena: number;
  jedinica: string;
  stanica: "kuhinja" | "pecenjara" | "sank";
  napomena_cijene: string | null;
  redoslijed: number;
};

type DemoItem = {
  id: string;
  proizvod_id: string;
  naziv: string;
  jedinica: string;
  kolicina: number;
  cijena: number;
  napomena: string | null;
  prilozi: { proizvod_id: string; naziv: string; cijena: number; standard: boolean; poseban: boolean }[];
  stornirano: boolean;
  storno_razlog: string | null;
  storno_vrijednost: number | null;
  roditeljska_stavka_id?: string;
};

type DemoOrder = {
  id: string;
  broj: string;
  stanica: "kuhinja" | "pecenjara" | "sank";
  status: "Novo" | "U pripremi" | "Gotovo" | "Izdato";
  kreirao_ime: string;
  kreirano_at: string;
  izmijenjeno_at: string;
  cijena_pecenjari: number | null;
  stavke_narudzbe: DemoItem[];
};

type DemoBill = {
  id: string;
  broj: number;
  sto_id: number;
  stolovi: number[];
  konobar_ime: string;
  otvoren_at: string;
  podijeljeno_na: number | null;
  status: "otvoren" | "zatvoren";
  narudzbe: DemoOrder[];
};

type DemoCreateOrderResult = {
  racunId: string;
  broj: number;
  narudzbe: { id: string; broj: string; stanica: DemoProduct["stanica"] }[];
};

type DemoState = {
  version: 1 | 2;
  kategorije: { id: string; naziv: string; redoslijed: number }[];
  proizvodi: DemoProduct[];
  racuni: DemoBill[];
  requestIds: Record<string, unknown>;
  reservations: {
    id: string; ime: string; broj_gostiju: number; rezervisano_za: string;
    sto_id: number | null; telefon: string | null; napomena: string | null;
    status: "aktivna" | "realizovana" | "otkazana";
  }[];
  naplate: {
    id: string; racun_id: string; ukupno: number; nacin: string; gost_duznik: string | null;
    naplatio_ime: string; kreirano_at: string; podijeljeno_na: number | null;
    baksis: number;
  }[];
  smjene: {
    id: string; oznaka: "I" | "II"; pocetak_at: string; preuzeo_ime: string;
    status: "otvorena" | "zatvorena"; pocetni_popis_sanka: Record<string, number>;
    zavrsni_popis_sanka: Record<string, number> | null; predani_pazar: number | null;
    zatvorio_ime: string | null; zatvoreno_at: string | null; bar_pazar: number | null;
    kuhinja_pecenjara_pazar: number | null; ocekivani_pazar: number | null; razlika_pazara: number | null;
  }[];
  pecenjaraPopisi: {
    smjena_id: string;
    pocetne_koke_pecene: number;
    pocetne_koke_sirove: number;
    pocetna_janjetina_kg: number;
    dodatne_koke: number;
    dodatna_janjetina_kg: number;
    preostale_koke: number | null;
    preostala_janjetina_kg: number | null;
    prodane_koke: number | null;
    prodana_janjetina_kg: number | null;
    pazar_po_popisu: number | null;
    predani_pazar: number | null;
    razlika: number | null;
    evidentirao_ime: string;
    kreirano_at: string;
    zatvoreno_at: string | null;
  }[];
  dopune: { id: string; smjena_id: string; proizvod_id: string; kolicina: number }[];
  zaliha: {
    id: string; naziv: string; jedinica: string; stanje: number; minimum: number;
    nabavna_cijena: number | null; prodajna_cijena: number | null; aktivan: boolean;
  }[];
  recepti: { id: string; proizvod_id: string; sastojci_recepta: { zaliha_id: string; kolicina: number }[] }[];
  zahtjevi: {
    id: string; zaliha_id: string; kolicina: number | null; izvor: string; status: string;
    kreirao_ime: string; kreirano_at: string; isporucio_ime: string | null;
  }[];
  prodajeMesnice: { id: string; zaliha_id: string; kolicina: number; ukupno: number; kreirano_at: string }[];
  zaposlenici: {
    id: string; ime: string; uloga: string; pin: string; aktivan: boolean; kreirano_at: string;
  }[];
  pinovi: { osoblje: string; sefica: string; poseban_prilog: string };
  uplatePecenjare: { id: string; konobar_ime: string; iznos: number; kreirano_at: string }[];
  dag: { id: string; ime: string; detalji: string; vrijeme: string }[];
};

const DATA_FILE = process.env.SMAJIC_DEMO_DATA_FILE ?? path.join(process.cwd(), ".data", "smajic-demo.json");
const DATA_DIR = path.dirname(DATA_FILE);
let writeChain: Promise<void> = Promise.resolve();

function tuples(sql: string, marker: string): string[][] {
  const start = sql.indexOf(marker);
  if (start < 0) return [];
  const valuesAt = sql.indexOf("values", start) + "values".length;
  const conflictAt = sql.indexOf("on conflict", valuesAt);
  const end = conflictAt < 0 ? sql.indexOf(";", valuesAt) : conflictAt;
  const text = sql.slice(valuesAt, end < 0 ? undefined : end);
  const rows: string[][] = [];
  let fields: string[] = [];
  let field = "";
  let depth = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === "'" && text[i + 1] === "'") {
        field += "'";
        i += 1;
      } else if (character === "'") quoted = false;
      else field += character;
      continue;
    }
    if (character === "'") quoted = true;
    else if (character === "(") {
      depth += 1;
      if (depth === 1) {
        fields = [];
        field = "";
      } else field += character;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        fields.push(field.trim());
        rows.push(fields);
        field = "";
      } else field += character;
    } else if (character === "," && depth === 1) {
      fields.push(field.trim());
      field = "";
    } else if (depth > 0) field += character;
  }
  return rows;
}

function sqlValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.toUpperCase() === "NULL" ? null : trimmed;
}

export function parseDemoSeed(sql: string): Pick<DemoState, "kategorije" | "proizvodi"> {
  const categoryRows = tuples(sql, "insert into public.kategorije_menija");
  const productRows = tuples(sql, "insert into public.proizvodi");
  const kategorije = categoryRows.map((row) => ({
    id: sqlValue(row[0]) ?? "",
    naziv: sqlValue(row[1]) ?? "",
    redoslijed: Number(sqlValue(row[2])),
  }));
  const proizvodi = productRows.flatMap((row) => {
    const cijena = sqlValue(row[2]);
    if (cijena === null || row[5].toLowerCase() !== "true") return [];
    return [{
      id: randomUUID(),
      kategorija_id: sqlValue(row[0]) ?? "",
      naziv: sqlValue(row[1]) ?? "",
      cijena: Number(cijena),
      jedinica: sqlValue(row[3]) ?? "porcija",
      stanica: (sqlValue(row[4]) ?? "kuhinja") as DemoProduct["stanica"],
      napomena_cijene: sqlValue(row[6]),
      redoslijed: Number(sqlValue(row[7])),
    }];
  });
  if (kategorije.length !== 18 || proizvodi.length < 80) {
    throw new Error("Početni demo meni nije moguće učitati iz supabase/seed.sql.");
  }
  return { kategorije, proizvodi };
}

async function initialState(): Promise<DemoState> {
  const seedPath = path.join(process.cwd(), "supabase", "seed.sql");
  const seedSql = await readFile(seedPath, "utf8");
  const menu = parseDemoSeed(seedSql);
  const stockRows = tuples(seedSql, "insert into public.zaliha_artikli");
  const zaliha = stockRows.map((row) => ({
    id: randomUUID(),
    naziv: sqlValue(row[0]) ?? "",
    jedinica: sqlValue(row[1]) ?? "kg",
    stanje: Number(sqlValue(row[2])),
    minimum: Number(sqlValue(row[3])),
    nabavna_cijena: sqlValue(row[4]) === null ? null : Number(sqlValue(row[4])),
    prodajna_cijena: null,
    aktivan: true,
  }));
  const recipeInput: [string, string, number][] = [
    ["Natur šnicla", "Teletina", 0.2],
    ["Ćevapi – velika porcija", "Ćevapi", 1],
    ["Ćevapi – velika porcija", "Lepinja", 2],
    ["Pomfrit", "Pomfrit", 0.2],
  ];
  const recepti = new Map<string, DemoState["recepti"][number]>();
  for (const [productName, ingredientName, quantity] of recipeInput) {
    const product = menu.proizvodi.find((entry) => entry.naziv === productName);
    const ingredient = zaliha.find((entry) => entry.naziv === ingredientName);
    if (!product || !ingredient) continue;
    const recipe = recepti.get(product.id) ?? { id: randomUUID(), proizvod_id: product.id, sastojci_recepta: [] };
    recipe.sastojci_recepta.push({ zaliha_id: ingredient.id, kolicina: quantity });
    recepti.set(product.id, recipe);
  }
  return {
    version: 2,
    ...menu,
    racuni: [],
    requestIds: {},
    reservations: [],
    naplate: [],
    smjene: [],
    pecenjaraPopisi: [],
    dopune: [],
    zaliha,
    recepti: Array.from(recepti.values()),
    zahtjevi: [],
    prodajeMesnice: [],
    zaposlenici: [],
    pinovi: {
      osoblje: process.env.PIN_OSOBLJE ?? "0000",
      sefica: process.env.PIN_SEFICA ?? "1234",
      poseban_prilog: process.env.PIN_POSEBAN_PRILOG ?? "1111",
    },
    uplatePecenjare: [],
    dag: [],
  };
}

async function readState(): Promise<DemoState> {
  try {
    const text = await readFile(/* turbopackIgnore: true */ DATA_FILE, "utf8");
    const state = JSON.parse(text) as DemoState;
    if (state.version === 1 || state.version === 2) {
      if (state.version === 2) {
        state.pecenjaraPopisi ??= [];
        return state;
      }
      const defaults = await initialState();
      const upgraded: DemoState = { ...defaults, ...state, version: 2 };
      upgraded.requestIds ??= defaults.requestIds;
      upgraded.reservations ??= defaults.reservations;
      upgraded.naplate ??= defaults.naplate;
      upgraded.smjene ??= defaults.smjene;
      upgraded.pecenjaraPopisi ??= defaults.pecenjaraPopisi;
      upgraded.dopune ??= defaults.dopune;
      upgraded.zaliha ??= defaults.zaliha;
      upgraded.recepti ??= defaults.recepti;
      upgraded.zahtjevi ??= defaults.zahtjevi;
      upgraded.prodajeMesnice ??= defaults.prodajeMesnice;
      upgraded.zaposlenici ??= defaults.zaposlenici;
      upgraded.pinovi ??= defaults.pinovi;
      upgraded.uplatePecenjare ??= defaults.uplatePecenjare;
      upgraded.dag ??= defaults.dag;
      await writeState(upgraded);
      return upgraded;
    }
    throw new Error("Nepoznata verzija probnih podataka.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const state = await initialState();
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
    return state;
  }
}

async function writeState(state: DemoState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const temporary = `${DATA_FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), "utf8");
  await rename(temporary, DATA_FILE);
}

async function mutate<T>(action: (state: DemoState) => T): Promise<T> {
  let result!: T;
  const operation = writeChain.then(async () => {
    const state = await readState();
    result = action(state);
    await writeState(state);
  });
  writeChain = operation.catch(() => undefined);
  await operation;
  return result;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function billTotal(bill: DemoBill): number {
  return round(bill.narudzbe.flatMap((order) => order.stavke_narudzbe).reduce((sum, item) =>
    sum + (item.stornirano ? 0 : item.cijena * item.kolicina +
      item.prilozi.reduce((sideSum, side) => sideSum + side.cijena, 0)), 0));
}

function openBillForTable(state: DemoState, tableId: number): DemoBill | undefined {
  return state.racuni.find((bill) => bill.status === "otvoren" && bill.stolovi.includes(tableId));
}

export async function demoMenu() {
  const state = await readState();
  return {
    kategorije: state.kategorije.map((category) => ({
      ...category,
      proizvodi: state.proizvodi.filter((product) => product.kategorija_id === category.id),
    })),
  };
}

export async function demoTables() {
  const state = await readState();
  return {
    stolovi: Array.from({ length: 20 }, (_, index) => {
      const id = index + 1;
      const bill = openBillForTable(state, id);
      return {
        id,
        naziv: `Sto ${id}`,
        aktivan: true,
        racun: bill ? {
          racunId: bill.id,
          ukupno: billTotal(bill),
          otvorenAt: bill.otvoren_at,
          minute: Math.max(0, Math.floor((Date.now() - Date.parse(bill.otvoren_at)) / 60000)),
          cekaNaplatu: bill.narudzbe.length > 0 && bill.narudzbe.every((order) => order.status === "Izdato"),
        } : null,
      };
    }),
  };
}

export async function demoCreateOrder(input: {
  requestId: string; stoId: number; stavke: { proizvodId: string; kolicina: number; napomena?: string;
    prilozi: { proizvodId: string; standard: boolean; poseban: boolean }[] }[];
  posebanPin?: string; konobarIme: string;
}): Promise<DemoCreateOrderResult> {
  return mutate((state) => {
    const previous = state.requestIds[input.requestId];
    if (previous) return previous as DemoCreateOrderResult;
    if (!Number.isInteger(input.stoId) || input.stoId < 1 || input.stoId > 20) throw new Error("Sto nije ispravan.");
    if (input.stavke.some((line) => !state.proizvodi.some((product) => product.id === line.proizvodId))) {
      throw new Error("Artikal menija nije pronađen.");
    }
    if (input.stavke.some((line) => line.prilozi.some((side) =>
      !state.proizvodi.some((product) => product.id === side.proizvodId)))) {
      throw new Error("Izabrani prilog nije pronađen.");
    }
    for (const line of input.stavke) {
      const parent = state.proizvodi.find((entry) => entry.id === line.proizvodId)!;
      for (const addon of line.prilozi) {
        const side = state.proizvodi.find((entry) => entry.id === addon.proizvodId)!;
        if (side.kategorija_id !== "prilozi" &&
          !(side.kategorija_id === "salate" && side.naziv.toLocaleLowerCase("bs").includes("krompir"))) {
          throw new Error("Izabrani artikal ne može biti prilog.");
        }
        if ((addon.standard && addon.poseban) || (addon.standard && !jeBesplatanPrilog(parent, side.naziv))) {
          throw new Error("Izabrani standardni prilog nije dozvoljen uz ovo jelo.");
        }
      }
    }
    if (input.stavke.some((line) => line.prilozi.some((side) => side.poseban)) &&
      input.posebanPin !== state.pinovi.poseban_prilog) {
      throw new Error("Pogrešan PIN za poseban prilog.");
    }
    const usage = new Map<string, number>();
    for (const line of input.stavke) {
      const product = state.proizvodi.find((entry) => entry.id === line.proizvodId)!;
      const recipe = state.recepti.find((entry) => entry.proizvod_id === product.id);
      for (const ingredient of recipe?.sastojci_recepta ?? []) {
        usage.set(ingredient.zaliha_id, (usage.get(ingredient.zaliha_id) ?? 0) + ingredient.kolicina * line.kolicina);
      }
    }
    for (const [stockId, quantity] of usage) {
      const stockItem = state.zaliha.find((entry) => entry.id === stockId);
      if (!stockItem || stockItem.stanje < quantity) throw new Error(`Nema dovoljno zalihe: ${stockItem?.naziv ?? "sastojak"}.`);
    }
    for (const [stockId, quantity] of usage) {
      const stockItem = state.zaliha.find((entry) => entry.id === stockId)!;
      stockItem.stanje = round(stockItem.stanje - quantity);
      if (stockItem.stanje <= stockItem.minimum &&
        !state.zahtjevi.some((request) => request.zaliha_id === stockId && request.status === "nov")) {
        state.zahtjevi.push({
          id: randomUUID(), zaliha_id: stockId, kolicina: null, izvor: "minimum",
          status: "nov", kreirao_ime: "Automatski", kreirano_at: new Date().toISOString(),
          isporucio_ime: null,
        });
      }
    }
    let bill = openBillForTable(state, input.stoId);
    const now = new Date().toISOString();
    if (!bill) {
      bill = {
        id: randomUUID(), broj: state.racuni.reduce((max, entry) => Math.max(max, entry.broj), 0) + 1,
        sto_id: input.stoId, stolovi: [input.stoId], konobar_ime: input.konobarIme,
        otvoren_at: now, podijeljeno_na: null, status: "otvoren", narudzbe: [],
      };
      state.racuni.push(bill);
    }
    const groups = new Map<DemoProduct["stanica"], DemoItem[]>();
    for (const line of input.stavke) {
      const product = state.proizvodi.find((entry) => entry.id === line.proizvodId)!;
      const addons = line.prilozi.map((selected) => {
        const side = state.proizvodi.find((entry) => entry.id === selected.proizvodId)!;
        const standard = selected.standard;
        return {
          proizvod_id: side.id, naziv: side.naziv,
          cijena: standard ? 0 : round(side.cijena * line.kolicina),
          standard, poseban: selected.poseban,
        };
      });
      const itemId = randomUUID();
      const item: DemoItem = {
        id: itemId, proizvod_id: product.id, naziv: product.naziv, jedinica: product.jedinica,
        kolicina: line.kolicina, cijena: product.cijena, napomena: line.napomena?.trim() || null,
        prilozi: addons, stornirano: false, storno_razlog: null, storno_vrijednost: null,
      };
      groups.set(product.stanica, [...(groups.get(product.stanica) ?? []), item]);
      for (const addon of addons) {
        const productAddon = state.proizvodi.find((entry) => entry.id === addon.proizvod_id)!;
        if (productAddon.stanica === product.stanica) continue;
        const companion: DemoItem = {
          id: randomUUID(), proizvod_id: productAddon.id, naziv: productAddon.naziv,
          jedinica: productAddon.jedinica, kolicina: line.kolicina, cijena: 0,
          napomena: `Prilog uz ${product.naziv}`, prilozi: [], stornirano: false,
          storno_razlog: null, storno_vrijednost: null, roditeljska_stavka_id: itemId,
        };
        groups.set(productAddon.stanica, [...(groups.get(productAddon.stanica) ?? []), companion]);
      }
    }
    const created: DemoOrder[] = [];
    for (const [station, items] of groups) {
      const sequence = state.racuni.flatMap((entry) => entry.narudzbe).length + 1;
      const order: DemoOrder = {
        id: randomUUID(), broj: `#${String(sequence).padStart(4, "0")}`, stanica: station,
        status: "Novo", kreirao_ime: input.konobarIme, kreirano_at: now, izmijenjeno_at: now,
        cijena_pecenjari: null, stavke_narudzbe: items,
      };
      bill.narudzbe.push(order);
      created.push(order);
    }
    const response: DemoCreateOrderResult = { racunId: bill.id, broj: bill.broj, narudzbe: created.map(({ id, broj, stanica }) => ({ id, broj, stanica })) };
    state.requestIds[input.requestId] = response;
    state.dag.push({ id: randomUUID(), ime: input.konobarIme, detalji: `Poslana narudžba ${created.map((entry) => entry.broj).join(", ")} · Sto ${input.stoId}`, vrijeme: now });
    return response;
  });
}

export async function demoStationOrders(station: DemoProduct["stanica"]) {
  const state = await readState();
  const now = Date.now();
  return {
    narudzbe: state.racuni.filter((bill) => bill.status === "otvoren").flatMap((bill) => bill.narudzbe)
      .filter((order) => order.stanica === station && order.status !== "Izdato")
      .sort((a, b) => a.kreirano_at.localeCompare(b.kreirano_at))
      .map((order) => ({ ...order, cekaDugo: now - Date.parse(order.kreirano_at) >= 15 * 60_000 })),
  };
}

export async function demoSetOrderStatus(input: {
  orderId: string; station: DemoProduct["stanica"]; status: DemoOrder["status"];
  actor: string; cost?: number; lambKg?: number;
}) {
  return mutate((state) => {
    const order = state.racuni
      .filter((bill) => bill.status === "otvoren")
      .flatMap((bill) => bill.narudzbe)
      .find((entry) => entry.id === input.orderId);
    if (!order || order.stanica !== input.station) throw new Error("Narudžba nije pronađena za ovu stanicu.");
    const allowed: Partial<Record<DemoOrder["status"], DemoOrder["status"]>> = order.stanica === "pecenjara"
      ? { Novo: "U pripremi", "U pripremi": "Gotovo", Gotovo: "Izdato" }
      : { Novo: "U pripremi", "U pripremi": "Izdato" };
    if (allowed[order.status] !== input.status) throw new Error("Nije dozvoljen ovaj prelaz statusa.");
    if (input.status === "Gotovo") {
      if (input.cost === undefined || !Number.isFinite(input.cost) || input.cost < 0) throw new Error("Unesite ispravnu cijenu za pečenjaru.");
      const lamb = order.stavke_narudzbe.find((item) => item.jedinica === "kg" && item.naziv.toLowerCase().includes("jagnjetina"));
      if (lamb) {
        if (input.lambKg === undefined || !Number.isFinite(input.lambKg) || input.lambKg < 0) throw new Error("Unesite stvarnu količinu jagnjetine.");
        lamb.kolicina = input.lambKg;
      }
      order.cijena_pecenjari = input.cost;
    }
    order.status = input.status;
    order.izmijenjeno_at = new Date().toISOString();
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `${order.broj}: status ${order.status}`, vrijeme: order.izmijenjeno_at });
    return { id: order.id, status: order.status, cijena_pecenjari: order.cijena_pecenjari };
  });
}

function billDetail(bill: DemoBill, state: DemoState) {
  return {
    id: bill.id, broj: bill.broj, sto_id: bill.sto_id, konobar_ime: bill.konobar_ime,
    otvoren_at: bill.otvoren_at, podijeljeno_na: bill.podijeljeno_na,
    stolovi: bill.stolovi.map((id) => ({ id, naziv: `Sto ${id}` })),
    ukupno: billTotal(bill),
    sveIzdato: bill.narudzbe.length > 0 && bill.narudzbe.every((order) => order.status === "Izdato"),
    narudzbe: bill.narudzbe.map((order) => ({
      ...order,
      stavke_narudzbe: order.stavke_narudzbe.map((item) => ({
        ...item, storno_vrijednost: item.storno_vrijednost,
      })),
    })),
    naplate: state.naplate.filter((payment) => payment.racun_id === bill.id),
  };
}

export async function demoBillForTable(tableId: number) {
  const state = await readState();
  const bill = openBillForTable(state, tableId);
  return bill ? billDetail(bill, state) : null;
}

export async function demoOpenBills() {
  const state = await readState();
  return {
    racuni: state.racuni.filter((bill) => bill.status === "otvoren").map((bill) => ({
      id: bill.id, broj: bill.broj, stoId: bill.sto_id,
      stolovi: bill.stolovi.map((id) => ({ id, naziv: `Sto ${id}` })),
      konobar: bill.konobar_ime, otvorenAt: bill.otvoren_at,
      minute: Math.max(0, Math.floor((Date.now() - Date.parse(bill.otvoren_at)) / 60_000)),
      ukupno: billTotal(bill), podijeljenoNa: bill.podijeljeno_na,
      cekaNaplatu: bill.narudzbe.length > 0 && bill.narudzbe.every((order) => order.status === "Izdato"),
    })),
  };
}

export async function demoPayBill(input: {
  billId: string; actor: string; given: number; change: number; method: string;
  debtor?: string; split?: number;
}) {
  return mutate((state) => {
    const bill = state.racuni.find((entry) => entry.id === input.billId && entry.status === "otvoren");
    if (!bill) throw new Error("Otvoreni račun nije pronađen.");
    const total = billTotal(bill);
    if (input.method !== "dug" && (input.given < total || input.change > input.given - total)) throw new Error("Iznos naplate ili kusura nije ispravan.");
    if (input.method === "dug" && !input.debtor?.trim()) throw new Error("Unesite ime gosta za dug.");
    const payment = {
      id: randomUUID(), racun_id: bill.id, ukupno: total, nacin: input.method,
      gost_duznik: input.method === "dug" ? input.debtor!.trim() : null,
      naplatio_ime: input.actor, kreirano_at: new Date().toISOString(),
      podijeljeno_na: input.split ?? null,
      baksis: input.method === "dug" ? 0 : round(input.given - input.change - total),
    };
    state.naplate.push(payment);
    bill.status = "zatvoren";
    bill.podijeljeno_na = input.split ?? null;
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `Naplata računa ${bill.broj} · ${total.toFixed(2)} KM · ${input.method}`, vrijeme: payment.kreirano_at });
    return { naplata: payment };
  });
}

export async function demoStornoItem(input: { itemId: string; reason: string; actor: string }) {
  return mutate((state) => {
    const allItems = state.racuni.flatMap((bill) => bill.narudzbe).flatMap((order) => order.stavke_narudzbe);
    const item = allItems.find((entry) => entry.id === input.itemId);
    if (!item || item.stornirano) throw new Error("Stavka nije pronađena ili je već stornirana.");
    const value = round(item.cijena * item.kolicina + item.prilozi.reduce((sum, side) => sum + side.cijena, 0));
    item.stornirano = true;
    item.storno_razlog = input.reason;
    item.storno_vrijednost = value;
    for (const companion of allItems.filter((entry) => entry.roditeljska_stavka_id === item.id)) {
      companion.stornirano = true;
      companion.storno_razlog = input.reason;
      companion.storno_vrijednost = 0;
    }
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `Storno ${item.naziv}: ${input.reason} (${value.toFixed(2)} KM)`, vrijeme: new Date().toISOString() });
    return { stavka_id: item.id, vrijednost: value };
  });
}

export async function demoTransfer(input: { from: number; to: number; splitBillId?: string }) {
  return mutate((state) => {
    const source = openBillForTable(state, input.from);
    if (!source) throw new Error("Na izvornom stolu nema otvorenog računa.");
    const destination = openBillForTable(state, input.to);
    if (input.splitBillId) {
      const target = state.racuni.find((bill) => bill.id === input.splitBillId && bill.status === "otvoren");
      if (!target || target.stolovi.includes(input.to)) throw new Error("Račun nije moguće povezati sa stolom.");
      target.stolovi.push(input.to);
      return { racunId: target.id, stolovi: target.stolovi };
    }
    if (destination && destination.id !== source.id) {
      destination.narudzbe.push(...source.narudzbe);
      source.narudzbe = [];
      for (const table of source.stolovi) if (!destination.stolovi.includes(table)) destination.stolovi.push(table);
      source.status = "zatvoren";
      source.stolovi = [];
      return { racunId: destination.id, spojeno: true };
    }
    if (destination?.id === source.id) throw new Error("Račun već uključuje odabrani sto.");
    source.stolovi = source.stolovi.map((table) => table === input.from ? input.to : table);
    source.sto_id = input.to;
    return { racunId: source.id, premjesteno: true };
  });
}

export async function demoReservations(from: string, to: string) {
  const state = await readState();
  const fromTime = Date.parse(from);
  const toTime = Date.parse(to);
  return {
    rezervacije: state.reservations
      .filter((entry) => {
        const time = Date.parse(entry.rezervisano_za);
        return time >= fromTime && time < toTime;
      })
      .sort((a, b) => a.rezervisano_za.localeCompare(b.rezervisano_za)),
  };
}

export async function demoCreateReservation(input: {
  ime: string; brojGostiju: number; rezervisanoZa: string; stoId?: number | null;
  telefon?: string; napomena?: string; actor: string;
}) {
  return mutate((state) => {
    const reservation = {
      id: randomUUID(), ime: input.ime, broj_gostiju: input.brojGostiju,
      rezervisano_za: input.rezervisanoZa, sto_id: input.stoId ?? null,
      telefon: input.telefon || null, napomena: input.napomena || null, status: "aktivna" as const,
    };
    state.reservations.push(reservation);
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `Kreirana rezervacija za ${input.ime}`, vrijeme: new Date().toISOString() });
    return reservation.id;
  });
}

export async function demoSetReservationStatus(id: string, status: "realizovana" | "otkazana") {
  return mutate((state) => {
    const reservation = state.reservations.find((entry) => entry.id === id && entry.status === "aktivna");
    if (!reservation) throw new Error("Aktivna rezervacija nije pronađena.");
    reservation.status = status;
  });
}

export async function demoBarArticles() {
  const state = await readState();
  const shift = state.smjene.find((entry) => entry.status === "otvorena") ?? null;
  return {
    artikli: state.proizvodi.filter((entry) => entry.stanica === "sank").map((entry) => ({
      id: entry.id, naziv: entry.naziv, cijena: entry.cijena, jedinica: entry.jedinica,
    })),
    smjena: shift,
  };
}

export async function demoShifts() {
  const state = await readState();
  return {
    smjene: state.smjene
      .slice()
      .sort((a, b) => b.pocetak_at.localeCompare(a.pocetak_at))
      .slice(0, 20)
      .map((smjena) => ({
        ...smjena,
        popis_pecenjare_zatvoren: state.pecenjaraPopisi.some(
          (popis) => popis.smjena_id === smjena.id && popis.zatvoreno_at !== null,
        ),
      })),
  };
}

export async function demoOpenShift(input: { oznaka: "I" | "II"; actor: string; startingCount: Record<string, number> }) {
  return mutate((state) => {
    if (state.smjene.some((entry) => entry.status === "otvorena")) throw new Error("Već postoji otvorena smjena.");
    const shift = {
      id: randomUUID(), oznaka: input.oznaka, pocetak_at: new Date().toISOString(),
      preuzeo_ime: input.actor, status: "otvorena" as const,
      pocetni_popis_sanka: input.startingCount, zavrsni_popis_sanka: null,
      predani_pazar: null, zatvorio_ime: null, zatvoreno_at: null,
      bar_pazar: null, kuhinja_pecenjara_pazar: null, ocekivani_pazar: null, razlika_pazara: null,
    };
    state.smjene.push(shift);
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `Preuzeta smjena ${input.oznaka}`, vrijeme: shift.pocetak_at });
    return shift.id;
  });
}

export async function demoBarRefill(input: { productId: string; quantity: number }) {
  return mutate((state) => {
    const product = state.proizvodi.find((entry) => entry.id === input.productId && entry.stanica === "sank");
    const shift = state.smjene.find((entry) => entry.status === "otvorena");
    if (!product) throw new Error("Piće nije pronađeno.");
    if (!shift) throw new Error("Prvo otvorite smjenu.");
    const refill = { id: randomUUID(), smjena_id: shift.id, proizvod_id: product.id, kolicina: input.quantity };
    state.dopune.push(refill);
    state.dag.push({ id: randomUUID(), ime: "Šank", detalji: `Dopuna ${product.naziv}: ${input.quantity}`, vrijeme: new Date().toISOString() });
    return refill.id;
  });
}

export async function demoCloseShift(input: {
  id: string; finalCount: Record<string, number>; tendered: number; actor: string;
}) {
  return mutate((state) => {
    const shift = state.smjene.find((entry) => entry.id === input.id && entry.status === "otvorena");
    if (!shift) throw new Error("Otvorena smjena nije pronađena.");
    if (!state.pecenjaraPopisi.some(
      (popis) => popis.smjena_id === shift.id && popis.zatvoreno_at !== null,
    )) {
      throw new Error("Prvo zaključite popis pečenjare za ovu smjenu.");
    }
    const barSales = state.proizvodi.filter((product) => product.stanica === "sank").reduce((sum, product) => {
      const start = shift.pocetni_popis_sanka[product.naziv] ?? 0;
      const replenished = state.dopune.filter((entry) => entry.smjena_id === shift.id && entry.proizvod_id === product.id)
        .reduce((quantity, refill) => quantity + refill.kolicina, 0);
      const remaining = input.finalCount[product.naziv] ?? 0;
      return sum + (start + replenished - remaining) * product.cijena;
    }, 0);
    const stationSales = state.racuni.flatMap((bill) => bill.narudzbe)
      .filter((order) => order.status === "Izdato" && order.kreirano_at >= shift.pocetak_at &&
        (order.stanica === "kuhinja" || order.stanica === "pecenjara"))
      .flatMap((order) => order.stavke_narudzbe)
      .filter((item) => !item.stornirano && !item.napomena?.startsWith("Prilog uz "))
      .reduce((sum, item) => sum + item.kolicina * item.cijena + item.prilozi.reduce((addonSum, addon) => addonSum + addon.cijena, 0), 0);
    const expected = round(barSales + stationSales);
    shift.status = "zatvorena";
    shift.zavrsni_popis_sanka = input.finalCount;
    shift.predani_pazar = input.tendered;
    shift.bar_pazar = round(barSales);
    shift.kuhinja_pecenjara_pazar = round(stationSales);
    shift.ocekivani_pazar = expected;
    shift.razlika_pazara = round(input.tendered - expected);
    shift.zatvorio_ime = input.actor;
    shift.zatvoreno_at = new Date().toISOString();
    return {
      smjena_id: shift.id, bar_pazar: shift.bar_pazar,
      kuhinja_pecenjara_pazar: shift.kuhinja_pecenjara_pazar,
      ocekivani_pazar: shift.ocekivani_pazar,
      predani_pazar: shift.predani_pazar, razlika: shift.razlika_pazara,
    };
  });
}

export async function demoRoastingShiftCounts() {
  const state = await readState();
  const aktivnaSmjena = state.smjene
    .filter((entry) => entry.status === "otvorena")
    .sort((a, b) => b.pocetak_at.localeCompare(a.pocetak_at))[0] ?? null;
  return {
    aktivnaSmjena: aktivnaSmjena && {
      id: aktivnaSmjena.id,
      oznaka: aktivnaSmjena.oznaka,
      pocetak_at: aktivnaSmjena.pocetak_at,
      preuzeo_ime: aktivnaSmjena.preuzeo_ime,
    },
    popis: aktivnaSmjena
      ? state.pecenjaraPopisi.find((entry) => entry.smjena_id === aktivnaSmjena.id) ?? null
      : null,
    historija: state.pecenjaraPopisi
      .slice()
      .sort((a, b) => b.kreirano_at.localeCompare(a.kreirano_at))
      .slice(0, 20),
  };
}

export async function demoOpenRoastingCount(input: {
  smjenaId: string;
  pocetneKokePecene: number;
  pocetneKokeSirove: number;
  pocetnaJanjetinaKg: number;
  actor: string;
}) {
  return mutate((state) => {
    const shift = state.smjene.find(
      (entry) => entry.id === input.smjenaId && entry.status === "otvorena",
    );
    if (!shift) throw new Error("Aktivna smjena nije pronađena.");
    if (state.pecenjaraPopisi.some((entry) => entry.smjena_id === shift.id)) {
      throw new Error("Početni popis pečenjare je već unesen.");
    }
    const popis: DemoState["pecenjaraPopisi"][number] = {
      smjena_id: shift.id,
      pocetne_koke_pecene: input.pocetneKokePecene,
      pocetne_koke_sirove: input.pocetneKokeSirove,
      pocetna_janjetina_kg: input.pocetnaJanjetinaKg,
      dodatne_koke: 0,
      dodatna_janjetina_kg: 0,
      preostale_koke: null,
      preostala_janjetina_kg: null,
      prodane_koke: null,
      prodana_janjetina_kg: null,
      pazar_po_popisu: null,
      predani_pazar: null,
      razlika: null,
      evidentirao_ime: input.actor,
      kreirano_at: new Date().toISOString(),
      zatvoreno_at: null,
    };
    state.pecenjaraPopisi.push(popis);
    state.dag.push({
      id: randomUUID(),
      ime: input.actor,
      detalji: `Početni popis pečenjare za smjenu ${shift.oznaka}`,
      vrijeme: popis.kreirano_at,
    });
    return popis;
  });
}

export async function demoCloseRoastingCount(input: {
  smjenaId: string;
  dodatneKoke: number;
  dodatnaJanjetinaKg: number;
  preostaleKoke: number;
  preostalaJanjetinaKg: number;
  predaniPazar: number;
  actor: string;
}) {
  return mutate((state) => {
    const shift = state.smjene.find(
      (entry) => entry.id === input.smjenaId && entry.status === "otvorena",
    );
    const popis = state.pecenjaraPopisi.find(
      (entry) => entry.smjena_id === input.smjenaId && entry.zatvoreno_at === null,
    );
    if (!shift || !popis) throw new Error("Otvoren popis pečenjare nije pronađen.");
    const rezultat = izracunajPopisPecenjare({
      pocetneKokePecene: popis.pocetne_koke_pecene,
      pocetneKokeSirove: popis.pocetne_koke_sirove,
      dodatneKoke: input.dodatneKoke,
      preostaleKoke: input.preostaleKoke,
      pocetnaJanjetinaKg: popis.pocetna_janjetina_kg,
      dodatnaJanjetinaKg: input.dodatnaJanjetinaKg,
      preostalaJanjetinaKg: input.preostalaJanjetinaKg,
      predaniPazar: input.predaniPazar,
    });
    const zatvorenoAt = new Date().toISOString();
    Object.assign(popis, {
      dodatne_koke: input.dodatneKoke,
      dodatna_janjetina_kg: input.dodatnaJanjetinaKg,
      preostale_koke: input.preostaleKoke,
      preostala_janjetina_kg: input.preostalaJanjetinaKg,
      prodane_koke: rezultat.prodaneKoke,
      prodana_janjetina_kg: rezultat.prodanaJanjetinaKg,
      pazar_po_popisu: rezultat.pazarPoPopisu,
      predani_pazar: input.predaniPazar,
      razlika: rezultat.razlika,
      evidentirao_ime: input.actor,
      zatvoreno_at: zatvorenoAt,
    });
    state.dag.push({
      id: randomUUID(),
      ime: input.actor,
      detalji: `Zatvoren popis pečenjare: ${rezultat.pazarPoPopisu.toFixed(2)} KM, razlika ${rezultat.razlika.toFixed(2)} KM`,
      vrijeme: zatvorenoAt,
    });
    return popis;
  });
}

export async function demoInventory() {
  const state = await readState();
  return { zaliha: state.zaliha.filter((entry) => entry.aktivan).sort((a, b) => a.naziv.localeCompare(b.naziv, "bs")) };
}

export async function demoUpdateInventory(input: {
  id: string; minimum?: number; nabavnaCijena?: number | null; prodajnaCijena?: number | null;
}) {
  return mutate((state) => {
    const item = state.zaliha.find((entry) => entry.id === input.id);
    if (!item) throw new Error("Artikal zalihe nije pronađen.");
    if (input.minimum !== undefined) item.minimum = input.minimum;
    if (input.nabavnaCijena !== undefined) item.nabavna_cijena = input.nabavnaCijena;
    if (input.prodajnaCijena !== undefined) item.prodajna_cijena = input.prodajnaCijena;
    state.dag.push({ id: randomUUID(), ime: "Šefica", detalji: `Izmijenjen artikal zalihe: ${item.naziv}`, vrijeme: new Date().toISOString() });
  });
}

export async function demoInventoryChange(input: { id: string; delta: number; reason: string; actor: string }) {
  return mutate((state) => {
    const item = state.zaliha.find((entry) => entry.id === input.id);
    if (!item) throw new Error("Artikal zalihe nije pronađen.");
    const resulting = item.stanje + input.delta;
    if (resulting < 0) throw new Error("Promjena bi stanje zalihe spustila ispod nule.");
    item.stanje = round(resulting);
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `${item.naziv}: ${input.delta > 0 ? "+" : ""}${input.delta} · ${input.reason}`, vrijeme: new Date().toISOString() });
    return { stanje: item.stanje };
  });
}

export async function demoStockRequests() {
  const state = await readState();
  return {
    zahtjevi: state.zahtjevi.map((request) => {
      const item = state.zaliha.find((entry) => entry.id === request.zaliha_id)!;
      return {
        id: request.id, kolicina: request.kolicina, izvor: request.izvor, status: request.status,
        kreirao_ime: request.kreirao_ime, kreirano_at: request.kreirano_at,
        zaliha_artikli: { id: item.id, naziv: item.naziv, jedinica: item.jedinica, stanje: item.stanje, minimum: item.minimum },
      };
    }).sort((a, b) => b.kreirano_at.localeCompare(a.kreirano_at)),
  };
}

export async function demoCreateStockRequest(input: { stockId: string; quantity?: number; actor: string }) {
  return mutate((state) => {
    const item = state.zaliha.find((entry) => entry.id === input.stockId);
    if (!item) throw new Error("Artikal zalihe nije pronađen.");
    const existing = state.zahtjevi.find((entry) => entry.zaliha_id === item.id && entry.status === "nov");
    if (existing) return existing.id;
    const request = {
      id: randomUUID(), zaliha_id: item.id, kolicina: input.quantity ?? null,
      izvor: "kuhinja", status: "nov", kreirao_ime: input.actor,
      kreirano_at: new Date().toISOString(), isporucio_ime: null,
    };
    state.zahtjevi.push(request);
    return request.id;
  });
}

export async function demoProcessStockRequest(input: {
  requestId: string; action: "isporuci" | "nema_na_stanju"; quantity?: number; actor: string;
}) {
  return mutate((state) => {
    const request = state.zahtjevi.find((entry) => entry.id === input.requestId && entry.status === "nov");
    if (!request) throw new Error("Otvoreni zahtjev nije pronađen.");
    const item = state.zaliha.find((entry) => entry.id === request.zaliha_id)!;
    if (input.action === "isporuci") {
      if (input.quantity === undefined || input.quantity <= 0) throw new Error("Količina isporuke nije ispravna.");
      const resulting = item.stanje + input.quantity;
      if (resulting <= item.minimum) throw new Error("Isporuka mora podići stanje iznad minimuma.");
      item.stanje = round(resulting);
      request.kolicina = input.quantity;
      request.status = "isporucen";
    } else request.status = "nema_na_stanju";
    request.isporucio_ime = input.actor;
    state.dag.push({ id: randomUUID(), ime: input.actor, detalji: `Zahtjev mesnice ${request.status}: ${item.naziv}`, vrijeme: new Date().toISOString() });
    return { stanje: item.stanje };
  });
}

export async function demoMeatSale(input: { stockId: string; quantity: number }) {
  return mutate((state) => {
    const item = state.zaliha.find((entry) => entry.id === input.stockId);
    if (!item || item.jedinica !== "kg") throw new Error("Artikal mesa nije pronađen.");
    if (item.stanje < input.quantity) throw new Error("Nema dovoljno zalihe za prodaju.");
    if (item.prodajna_cijena === null) throw new Error("Prodajna cijena po kilogramu nije podešena.");
    item.stanje = round(item.stanje - input.quantity);
    const sale = {
      id: randomUUID(), zaliha_id: item.id, kolicina: input.quantity,
      ukupno: round(item.prodajna_cijena * input.quantity), kreirano_at: new Date().toISOString(),
    };
    state.prodajeMesnice.push(sale);
    return sale;
  });
}

export async function demoRecipes() {
  const state = await readState();
  return {
    proizvodi: state.proizvodi.map(({ id, naziv, stanica }) => ({ id, naziv, stanica })),
    zaliha: state.zaliha.map(({ id, naziv, jedinica }) => ({ id, naziv, jedinica })),
    recepti: state.recepti,
  };
}

export async function demoSaveRecipe(productId: string, ingredients: { stockId: string; quantity: number }[]) {
  return mutate((state) => {
    if (!state.proizvodi.some((entry) => entry.id === productId)) throw new Error("Proizvod nije pronađen.");
    if (ingredients.some((ingredient) => !state.zaliha.some((entry) => entry.id === ingredient.stockId))) throw new Error("Sastojak nije pronađen.");
    let recipe = state.recepti.find((entry) => entry.proizvod_id === productId);
    if (!recipe) {
      recipe = { id: randomUUID(), proizvod_id: productId, sastojci_recepta: [] };
      state.recepti.push(recipe);
    }
    recipe.sastojci_recepta = ingredients.map((entry) => ({ zaliha_id: entry.stockId, kolicina: entry.quantity }));
    return recipe.id;
  });
}

export async function demoPurchaseSuggestions() {
  const state = await readState();
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sold = new Map<string, number>();
  for (const order of state.racuni.flatMap((bill) => bill.narudzbe).filter((entry) => Date.parse(entry.kreirano_at) >= since)) {
    for (const item of order.stavke_narudzbe.filter((entry) => !entry.stornirano && !entry.roditeljska_stavka_id)) {
      const recipe = state.recepti.find((entry) => entry.proizvod_id === item.proizvod_id);
      for (const ingredient of recipe?.sastojci_recepta ?? []) {
        sold.set(ingredient.zaliha_id, (sold.get(ingredient.zaliha_id) ?? 0) + ingredient.kolicina * item.kolicina);
      }
    }
  }
  return {
    nabavka: state.zaliha.map((item) => {
      const weekly = sold.get(item.id) ?? 0;
      return {
        id: item.id, naziv: item.naziv, jedinica: item.jedinica, stanje: item.stanje,
        sedmodnevna_prodaja: round(weekly),
        predlozena_nabavka: Math.max(0, Math.ceil(weekly * 1.2 - item.stanje)),
      };
    }).filter((item) => item.predlozena_nabavka > 0),
  };
}

export async function demoReport(days: number) {
  const state = await readState();
  const from = Date.now() - days * 24 * 60 * 60 * 1000;
  const payments = state.naplate.filter((payment) => Date.parse(payment.kreirano_at) >= from);
  const bills = state.racuni.filter((bill) => Date.parse(bill.otvoren_at) >= from);
  const orders = bills.flatMap((bill) => bill.narudzbe);
  const allItems = orders.flatMap((order) => order.stavke_narudzbe);
  const totalOrdered = round(allItems.reduce((sum, item) => sum + (item.stornirano ? 0 :
    item.cijena * item.kolicina + item.prilozi.reduce((addon, side) => addon + side.cijena, 0)), 0));
  const paid = payments.filter((payment) => payment.nacin !== "dug");
  const paidTotal = round(paid.reduce((sum, payment) => sum + payment.ukupno, 0));
  const debts = payments.filter((payment) => payment.nacin === "dug");
  const productTotals = new Map<string, { quantity: number; total: number }>();
  for (const item of allItems.filter((entry) => !entry.stornirano && !entry.roditeljska_stavka_id)) {
    const aggregate = productTotals.get(item.naziv) ?? { quantity: 0, total: 0 };
    aggregate.quantity += item.kolicina;
    aggregate.total += item.kolicina * item.cijena + item.prilozi.reduce((sum, side) => sum + side.cijena, 0);
    productTotals.set(item.naziv, aggregate);
  }
  const waiterTotals = new Map<string, { amount: number; tip: number; count: number }>();
  for (const payment of payments) {
    const entry = waiterTotals.get(payment.naplatio_ime) ?? { amount: 0, tip: 0, count: 0 };
    if (payment.nacin !== "dug") entry.amount += payment.ukupno;
    entry.tip += payment.baksis ?? 0;
    entry.count += 1;
    waiterTotals.set(payment.naplatio_ime, entry);
  }
  const margin = orders.filter((order) => order.stanica === "pecenjara" && order.status === "Izdato")
    .reduce((sum, order) => sum + order.stavke_narudzbe.filter((item) => !item.stornirano)
      .reduce((lineSum, item) => lineSum + item.kolicina * item.cijena, 0) - (order.cijena_pecenjari ?? 0), 0);
  const paidByShift = state.smjene.map((shift) => ({
    id: shift.id, oznaka: shift.oznaka, preuzeo_ime: shift.preuzeo_ime,
    pocetak_at: shift.pocetak_at, predani_pazar: shift.predani_pazar,
    naplaceno: round(payments.filter((payment) => payment.kreirano_at >= shift.pocetak_at &&
      (!shift.zatvoreno_at || payment.kreirano_at <= shift.zatvoreno_at))
      .filter((payment) => payment.nacin !== "dug").reduce((sum, payment) => sum + payment.ukupno, 0)),
  })).filter((shift) => Date.parse(shift.pocetak_at) >= from);
  const food = allItems.filter((item) => !item.stornirano && !item.roditeljska_stavka_id)
    .filter((item) => state.proizvodi.find((product) => product.id === item.proizvod_id)?.stanica !== "sank")
    .reduce((sum, item) => sum + item.kolicina * item.cijena, 0);
  const drinks = allItems.filter((item) => !item.stornirano && !item.roditeljska_stavka_id)
    .filter((item) => state.proizvodi.find((product) => product.id === item.proizvod_id)?.stanica === "sank")
    .reduce((sum, item) => sum + item.kolicina * item.cijena, 0);
  const addons = allItems.filter((item) => !item.stornirano)
    .reduce((sum, item) => sum + item.prilozi.reduce((addon, side) => addon + side.cijena, 0), 0);
  const orderedOrders = orders.filter((order) => order.status === "Izdato");
  const averageMinutes = orderedOrders.length
    ? orderedOrders.reduce((sum, order) => sum + (Date.parse(order.izmijenjeno_at) - Date.parse(order.kreirano_at)) / 60000, 0) / orderedOrders.length
    : 0;
  return {
    naplaceno: paidTotal,
    naruceno: totalOrdered,
    prosjecan_racun: paid.length ? round(paidTotal / paid.length) : 0,
    dug: round(debts.reduce((sum, payment) => sum + payment.ukupno, 0)),
    racuni: payments.length,
    baksis: round(payments.reduce((sum, payment) => sum + (payment.baksis ?? 0), 0)),
    otvoreni_racuni: state.racuni.filter((bill) => bill.status === "otvoren").length,
    hrana: round(food),
    pice: round(drinks),
    prilozi_ukupno: round(addons),
    prosjek_vrijeme_izdavanja_minuta: round(averageMinutes),
    marza_pecenjare: round(margin),
    po_konobaru: Array.from(waiterTotals, ([ime, value]) => ({
      ime, naplaceno: round(value.amount), baksis: round(value.tip), broj_racuna: value.count,
    })),
    po_proizvodu: Array.from(productTotals, ([naziv, value]) => ({
      naziv, kolicina: round(value.quantity), promet: round(value.total),
    })).sort((a, b) => b.kolicina - a.kolicina).slice(0, 20),
    po_smjeni: paidByShift,
  };
}

export async function demoWaiterStats(actor: string, days: number) {
  const state = await readState();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const payments = state.naplate.filter((payment) => payment.naplatio_ime === actor && Date.parse(payment.kreirano_at) >= since);
  const paid = payments.filter((payment) => payment.nacin !== "dug");
  const total = paid.reduce((sum, payment) => sum + payment.ukupno, 0);
  return {
    period: days, ime: actor, brojRacuna: payments.length,
    naplaceno: round(total),
    dug: round(payments.filter((payment) => payment.nacin === "dug").reduce((sum, payment) => sum + payment.ukupno, 0)),
    prosjecanRacun: paid.length ? round(total / paid.length) : 0,
    baksis: round(payments.reduce((sum, payment) => sum + (payment.baksis ?? 0), 0)),
  };
}

export async function demoGuestDebts() {
  const state = await readState();
  return {
    dugovi: state.naplate.filter((payment) => payment.nacin === "dug").map((payment) => {
      const bill = state.racuni.find((entry) => entry.id === payment.racun_id);
      return {
        id: payment.racun_id, broj: bill?.broj ?? 0, duznik: payment.gost_duznik,
        konobar: bill?.konobar_ime ?? payment.naplatio_ime, kreirano: payment.kreirano_at,
        iznos: payment.ukupno,
      };
    }),
  };
}

export async function demoCollectGuestDebt(input: { billId: string; method: "gotovina" | "kartica"; actor: string }) {
  return mutate((state) => {
    const payment = state.naplate.find((entry) => entry.racun_id === input.billId && entry.nacin === "dug");
    if (!payment) throw new Error("Dug nije pronađen ili je već naplaćen.");
    payment.nacin = input.method;
    payment.naplatio_ime = input.actor;
    payment.kreirano_at = new Date().toISOString();
    return payment;
  });
}

export async function demoEmployeeLogin(name: string, pin: string): Promise<{ id: string; ime: string } | null> {
  const state = await readState();
  const employee = state.zaposlenici.find((entry) => entry.aktivan && entry.uloga === "konobar" &&
    entry.ime.toLocaleLowerCase("bs") === name.toLocaleLowerCase("bs"));
  if (!employee) return state.zaposlenici.some((entry) => entry.uloga === "konobar" && entry.aktivan)
    ? null
    : { id: randomUUID(), ime: name };
  return employee.pin === pin ? { id: employee.id, ime: employee.ime } : null;
}

export async function demoVerifyPin(role: string, pin: string): Promise<boolean> {
  const state = await readState();
  if (role === "sefica") return state.pinovi.sefica === pin;
  if (role === "poseban_prilog") return state.pinovi.poseban_prilog === pin;
  const staffRole = role === "konobar" ? "konobar" : role;
  const namedStaff = state.zaposlenici.filter((entry) => entry.aktivan && entry.uloga === staffRole);
  return namedStaff.length > 0
    ? namedStaff.some((entry) => entry.pin === pin)
    : state.pinovi.osoblje === pin;
}

export async function demoEmployees() {
  const state = await readState();
  return {
    zaposlenici: state.zaposlenici.map((employee) => ({
      id: employee.id, ime: employee.ime, uloga: employee.uloga,
      aktivan: employee.aktivan, kreirano_at: employee.kreirano_at,
    })),
  };
}

export async function demoSaveEmployee(input: { id?: string; ime: string; uloga: string; pin: string }) {
  return mutate((state) => {
    let employee = input.id ? state.zaposlenici.find((entry) => entry.id === input.id) : undefined;
    if (!employee) {
      employee = {
        id: randomUUID(), ime: input.ime, uloga: input.uloga, pin: input.pin,
        aktivan: true, kreirano_at: new Date().toISOString(),
      };
      state.zaposlenici.push(employee);
    } else {
      employee.ime = input.ime;
      employee.uloga = input.uloga;
      employee.pin = input.pin;
    }
    return employee.id;
  });
}

export async function demoSetEmployeeStatus(id: string, active: boolean) {
  return mutate((state) => {
    const employee = state.zaposlenici.find((entry) => entry.id === id);
    if (!employee) throw new Error("Zaposlenik nije pronađen.");
    employee.aktivan = active;
  });
}

export async function demoChangePin(kind: "osoblje" | "sefica" | "poseban_prilog", pin: string) {
  return mutate((state) => {
    state.pinovi[kind] = pin;
  });
}

export async function demoActivityLog() {
  const state = await readState();
  return {
    dnevnik: state.dag.slice().reverse().slice(0, 100).map((entry) => ({
      id: entry.id, akter_ime: entry.ime, akter_uloga: "demo",
      radnja: entry.detalji, entitet: "demo", entitet_id: entry.id,
      detalji: {}, kreirano_at: entry.vrijeme,
    })),
  };
}

export async function demoButcherDebts() {
  const state = await readState();
  const issued = new Map<string, number>();
  const paid = new Map<string, number>();
  for (const order of state.racuni.flatMap((bill) => bill.narudzbe)
    .filter((entry) => entry.stanica === "pecenjara" && entry.status === "Izdato")) {
    const key = order.kreirao_ime.toLocaleLowerCase("bs");
    issued.set(key, (issued.get(key) ?? 0) + (order.cijena_pecenjari ?? 0));
  }
  for (const payment of state.uplatePecenjare) {
    const key = payment.konobar_ime.toLocaleLowerCase("bs");
    paid.set(key, (paid.get(key) ?? 0) + payment.iznos);
  }
  return {
    dugovi: Array.from(issued, ([key, amount]) => ({
      ime: state.racuni.flatMap((bill) => bill.narudzbe).find((order) => order.kreirao_ime.toLocaleLowerCase("bs") === key)?.kreirao_ime ?? key,
      izdato: round(amount), placeno: round(paid.get(key) ?? 0),
      dug: round(amount - (paid.get(key) ?? 0)),
    })).sort((a, b) => b.dug - a.dug),
  };
}

export async function demoButcherPayment(input: { waiter: string; amount: number }) {
  return mutate((state) => {
    const outstanding = awaitlessButcherDebt(state, input.waiter);
    if (outstanding < input.amount) throw new Error("Uplata je veća od evidentiranog duga.");
    const payment = {
      id: randomUUID(), konobar_ime: input.waiter, iznos: input.amount,
      kreirano_at: new Date().toISOString(),
    };
    state.uplatePecenjare.push(payment);
    return payment;
  });
}

export async function demoCloseBusinessDay(actor: string) {
  return mutate((state) => {
    if (state.racuni.some((bill) => bill.status === "otvoren")) throw new Error("Nije moguće zatvoriti dan dok postoje otvoreni računi.");
    const today = new Date().toISOString().slice(0, 10);
    const payments = state.naplate.filter((payment) => payment.kreirano_at.slice(0, 10) === today);
    const total = round(payments.filter((payment) => payment.nacin !== "dug").reduce((sum, payment) => sum + payment.ukupno, 0));
    const result = { datum: today, racuna: payments.length, naplaceno: total, zatvorio: actor };
    state.dag.push({ id: randomUUID(), ime: actor, detalji: `Zatvoren dan ${today}; ${payments.length} računa; ${total.toFixed(2)} KM`, vrijeme: new Date().toISOString() });
    return result;
  });
}

export async function demoIssuedOrdersSince(from: string, waiter: string) {
  const state = await readState();
  const fromTime = Date.parse(from);
  return {
    obavijesti: state.racuni.flatMap((bill) => bill.narudzbe)
      .filter((order) => order.status === "Izdato" && order.kreirao_ime === waiter &&
        Date.parse(order.izmijenjeno_at) >= fromTime)
      .sort((a, b) => a.izmijenjeno_at.localeCompare(b.izmijenjeno_at))
      .slice(0, 50)
      .map((order) => ({
        id: order.id, broj: order.broj, stanica: order.stanica,
        izmijenjeno_at: order.izmijenjeno_at,
      })),
  };
}

function awaitlessButcherDebt(state: DemoState, waiterName: string): number {
  const key = waiterName.toLocaleLowerCase("bs");
  const issued = state.racuni.flatMap((bill) => bill.narudzbe)
    .filter((order) => order.stanica === "pecenjara" && order.status === "Izdato" &&
      order.kreirao_ime.toLocaleLowerCase("bs") === key)
    .reduce((sum, order) => sum + (order.cijena_pecenjari ?? 0), 0);
  const paid = state.uplatePecenjare.filter((payment) => payment.konobar_ime.toLocaleLowerCase("bs") === key)
    .reduce((sum, payment) => sum + payment.iznos, 0);
  return round(issued - paid);
}

export function isDemoMode(): boolean {
  return resolveSupabaseRuntimeConfiguration().mode === "demo";
}
