import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let temporaryDirectory: string | undefined;

afterEach(async () => {
  vi.resetModules();
  delete process.env.SMAJIC_DEMO_DATA_FILE;
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("probni POS tok", () => {
  it("pamti narudžbu, status stanice i naplatu te sprečava dupliranje zahtjeva", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "smajic-demo-"));
    process.env.SMAJIC_DEMO_DATA_FILE = path.join(temporaryDirectory, "state.json");
    vi.resetModules();
    const demo = await import("./store");
    const { kategorije } = await demo.demoMenu();
    const product = kategorije.flatMap((category) => category.proizvodi).find((entry) => entry.naziv === "Pečenica");
    expect(product).toBeDefined();
    if (!product) throw new Error("Početni proizvod nije pronađen.");

    const requestId = crypto.randomUUID();
    const input = {
      requestId,
      stoId: 1,
      konobarIme: "Test Konobar",
      stavke: [{ proizvodId: product.id, kolicina: 2, prilozi: [] }],
    };
    const created = await demo.demoCreateOrder(input);
    await demo.demoCreateOrder(input);
    expect((await demo.demoStationOrders("kuhinja")).narudzbe).toHaveLength(1);

    const orderId = created.narudzbe[0].id;
    await demo.demoSetOrderStatus({ orderId, station: "kuhinja", status: "U pripremi", actor: "Test" });
    await demo.demoSetOrderStatus({ orderId, station: "kuhinja", status: "Izdato", actor: "Test" });
    expect((await demo.demoBillForTable(1))?.ukupno).toBe(12);

    await demo.demoPayBill({
      billId: created.racunId,
      actor: "Test Konobar",
      given: 20,
      change: 8,
      method: "gotovina",
    });
    expect(await demo.demoBillForTable(1)).toBeNull();
    expect((await demo.demoOpenBills()).racuni).toHaveLength(0);
  });

  it("nakon spajanja računa prikazuje i mijenja aktivnu narudžbu samo jednom", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "smajic-demo-"));
    process.env.SMAJIC_DEMO_DATA_FILE = path.join(temporaryDirectory, "state.json");
    vi.resetModules();
    const demo = await import("./store");
    const { kategorije } = await demo.demoMenu();
    const product = kategorije.flatMap((category) => category.proizvodi).find((entry) => entry.naziv === "Pečenica");
    expect(product).toBeDefined();
    if (!product) throw new Error("Početni proizvod nije pronađen.");

    const source = await demo.demoCreateOrder({
      requestId: crypto.randomUUID(),
      stoId: 1,
      konobarIme: "Test Konobar",
      stavke: [{ proizvodId: product.id, kolicina: 1, prilozi: [] }],
    });
    await demo.demoCreateOrder({
      requestId: crypto.randomUUID(),
      stoId: 2,
      konobarIme: "Test Konobar",
      stavke: [{ proizvodId: product.id, kolicina: 1, prilozi: [] }],
    });

    await demo.demoTransfer({ from: 1, to: 2 });
    const queue = (await demo.demoStationOrders("kuhinja")).narudzbe;
    expect(queue).toHaveLength(2);
    expect(queue.filter((order) => order.id === source.narudzbe[0].id)).toHaveLength(1);

    await demo.demoSetOrderStatus({
      orderId: source.narudzbe[0].id,
      station: "kuhinja",
      status: "U pripremi",
      actor: "Test",
    });
    expect((await demo.demoStationOrders("kuhinja")).narudzbe
      .find((order) => order.id === source.narudzbe[0].id)?.status).toBe("U pripremi");
  });

  it("obračunava popis pečenjare i traži njegovo zatvaranje prije smjene", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "smajic-demo-"));
    process.env.SMAJIC_DEMO_DATA_FILE = path.join(temporaryDirectory, "state.json");
    vi.resetModules();
    const demo = await import("./store");
    const smjenaId = await demo.demoOpenShift({
      oznaka: "I",
      actor: "Test Konobar",
      startingCount: {},
    });

    await expect(demo.demoCloseShift({
      id: smjenaId,
      finalCount: {},
      tendered: 418.5,
      actor: "Test Konobar",
    })).rejects.toThrow("Prvo zaključite popis pečenjare");

    await demo.demoOpenRoastingCount({
      smjenaId,
      pocetneKokePecene: 2,
      pocetneKokeSirove: 3,
      pocetnaJanjetinaKg: 8,
      actor: "Test Pečenjara",
    });
    const popis = await demo.demoCloseRoastingCount({
      smjenaId,
      dodatneKoke: 1,
      dodatnaJanjetinaKg: 2.5,
      preostaleKoke: 2,
      preostalaJanjetinaKg: 3.25,
      predaniPazar: 418.5,
      actor: "Test Pečenjara",
    });
    expect(popis).toMatchObject({
      prodane_koke: 4,
      prodana_janjetina_kg: 7.25,
      pazar_po_popisu: 418.5,
      razlika: 0,
    });

    await expect(demo.demoCloseShift({
      id: smjenaId,
      finalCount: {},
      tendered: 0,
      actor: "Test Konobar",
    })).resolves.toMatchObject({ smjena_id: smjenaId });
  });
});
