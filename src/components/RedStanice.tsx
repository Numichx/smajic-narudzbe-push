"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Stanica = "kuhinja" | "pecenjara" | "sank";
type StatusNarudzbe = "Novo" | "U pripremi" | "Gotovo" | "Izdato";

type Stavka = {
  id: string;
  naziv: string;
  jedinica: string;
  kolicina: number;
  napomena: string | null;
  stornirano: boolean;
};

type Narudzba = {
  id: string;
  broj: string;
  status: StatusNarudzbe;
  kreirano_at: string;
  cekaDugo: boolean;
  stavke_narudzbe: Stavka[];
};

const SLJEDECI_STATUS: Record<
  Stanica,
  Partial<Record<StatusNarudzbe, StatusNarudzbe>>
> = {
  kuhinja: { Novo: "U pripremi", "U pripremi": "Izdato" },
  pecenjara: {
    Novo: "U pripremi",
    "U pripremi": "Gotovo",
    Gotovo: "Izdato",
  },
  sank: { Novo: "U pripremi", "U pripremi": "Izdato" },
};

const TEKST_DUGMETA: Record<StatusNarudzbe, string> = {
  Novo: "Započni pripremu",
  "U pripremi": "Označi gotovo",
  Gotovo: "Izdaj konobaru",
  Izdato: "Izdato",
};

export function RedStanice({
  stanica,
  naslov,
}: {
  stanica: Stanica;
  naslov: string;
}) {
  const [narudzbe, setNarudzbe] = useState<Narudzba[]>([]);
  const [greska, setGreska] = useState("");
  const [ucitava, setUcitava] = useState(true);
  const [azuriraId, setAzuriraId] = useState("");
  const [cijenePecenjare, setCijenePecenjare] = useState<Record<string, string>>({});
  const [kolicineJagnjetine, setKolicineJagnjetine] = useState<Record<string, string>>({});

  const ucitajNarudzbe = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/narudzbe", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Narudžbe nije moguće učitati.");
        return;
      }

      setNarudzbe(podaci.narudzbe);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setUcitava(false);
    }
  }, []);

  useEffect(() => {
    const pocetnoUcitavanje = window.setTimeout(
      () => void ucitajNarudzbe(),
      0,
    );
    const interval = window.setInterval(() => void ucitajNarudzbe(), 3000);
    return () => {
      window.clearTimeout(pocetnoUcitavanje);
      window.clearInterval(interval);
    };
  }, [ucitajNarudzbe]);

  useEffect(() => {
    let active = true;
    let releaseWakeLock: (() => void) | undefined;
    const navigatorWithWakeLock = navigator as Navigator & {
      wakeLock?: {
        request(type: "screen"): Promise<{ release(): Promise<void> }>;
      };
    };

    async function requestWakeLock() {
      if (!active || document.visibilityState !== "visible" || !navigatorWithWakeLock.wakeLock) return;
      try {
        const lock = await navigatorWithWakeLock.wakeLock.request("screen");
        releaseWakeLock = () => void lock.release();
      } catch (error) {
        console.warn("Ekran nije moguće zadržati uključenim:", error);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void requestWakeLock();
      else releaseWakeLock?.();
    }
    void requestWakeLock();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      releaseWakeLock?.();
    };
  }, []);

  const zbirno = useMemo(() => {
    if (stanica !== "kuhinja") return [];
    const ukupnoPoNazivu = new Map<string, number>();

    for (const narudzba of narudzbe) {
      for (const stavka of narudzba.stavke_narudzbe) {
        if (stavka.stornirano || stavka.naziv.toLocaleLowerCase("bs").includes("sos")) {
          continue;
        }
        ukupnoPoNazivu.set(
          stavka.naziv,
          (ukupnoPoNazivu.get(stavka.naziv) ?? 0) + stavka.kolicina,
        );
      }
    }

    return Array.from(ukupnoPoNazivu, ([naziv, kolicina]) => ({
      naziv,
      kolicina,
    })).sort((a, b) => a.naziv.localeCompare(b.naziv, "bs"));
  }, [narudzbe, stanica]);

  function stampajNarudzbu(narudzba: Narudzba) {
    const prozor = window.open("", "_blank", "width=360,height=640");
    if (!prozor) {
      setGreska("Preglednik je blokirao prozor za štampu. Dozvolite iskačuće prozore.");
      return;
    }
    const stavke = narudzba.stavke_narudzbe.map((stavka) =>
      `${stavka.stornirano ? "STORNO · " : ""}${stavka.kolicina}${stavka.jedinica === "kg" ? " kg" : " x"} ${stavka.naziv}` +
      `${stavka.napomena ? `\n  Napomena: ${stavka.napomena}` : ""}`,
    );
    const stil = prozor.document.createElement("style");
    stil.textContent = "@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font: 12px monospace; white-space: pre-wrap; }";
    const sadrzaj = prozor.document.createElement("pre");
    sadrzaj.textContent = [`Smajić · ${naslov}`, narudzba.broj, "------------------------------", ...stavke].join("\n");
    prozor.document.title = `Narudžba ${narudzba.broj}`;
    prozor.document.head.append(stil);
    prozor.document.body.append(sadrzaj);
    prozor.focus();
    prozor.print();
  }

  async function promijeniStatus(narudzba: Narudzba) {
    const status = SLJEDECI_STATUS[stanica][narudzba.status];
    if (!status || azuriraId) return;
    const unesenaCijena = cijenePecenjare[narudzba.id];
    const cijenaPecenjari = status === "Gotovo"
      ? Number(unesenaCijena)
      : undefined;
    const imaJagnjetine = narudzba.stavke_narudzbe.some(
      (stavka) => stavka.jedinica === "kg" && stavka.naziv.toLocaleLowerCase("bs").includes("jagnjetina"),
    );
    const unesenaJagnjetina = kolicineJagnjetine[narudzba.id];
    if (
      status === "Gotovo" &&
      (unesenaCijena === undefined || unesenaCijena.trim() === "" ||
        !Number.isFinite(cijenaPecenjari) || (cijenaPecenjari ?? -1) < 0)
    ) {
      setGreska("Unesite ispravnu cijenu za pečenjaru.");
      return;
    }
    if (status === "Gotovo" && imaJagnjetine &&
      (unesenaJagnjetina === undefined || unesenaJagnjetina.trim() === "" ||
        !Number.isFinite(Number(unesenaJagnjetina)) || Number(unesenaJagnjetina) < 0)) {
      setGreska("Unesite stvarnu količinu jagnjetine u kilogramima.");
      return;
    }
    setAzuriraId(narudzba.id);
    setGreska("");

    try {
      const odgovor = await fetch(`/api/narudzbe/${narudzba.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          cijenaPecenjari,
          jagnjetinaKg: status === "Gotovo" && imaJagnjetine
            ? Number(unesenaJagnjetina)
            : undefined,
        }),
      });
      const podaci = await odgovor.json().catch(() => ({}));
      if (!odgovor.ok) {
        setGreska(
          podaci.greska ?? podaci.message ?? podaci.error ??
          `Status nije moguće promijeniti (HTTP ${odgovor.status}).`,
        );
        return;
      }

      await ucitajNarudzbe();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setAzuriraId("");
    }
  }

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-700">Smajić · Stanica</p>
            <h1 className="mt-1 text-2xl font-bold">{naslov}</h1>
          </div>
          <button
            type="button"
            onClick={() => void ucitajNarudzbe()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50"
          >
            Osvježi
          </button>
        </header>

        {greska && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {greska}
          </p>
        )}

        {stanica === "kuhinja" && (
          <details id="zbirno" className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold">
              Zbirno ({zbirno.length} jela)
            </summary>
            {zbirno.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {zbirno.map((stavka) => (
                  <li
                    key={stavka.naziv}
                    className="flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                  >
                    <span>{stavka.naziv}</span>
                    <strong>{stavka.kolicina}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-stone-500">Nema jela na čekanju.</p>
            )}
          </details>
        )}

        {ucitava ? (
          <p className="mt-6 text-sm text-stone-600">Učitavanje narudžbi...</p>
        ) : narudzbe.length === 0 ? (
          <p className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            Nema narudžbi na čekanju.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {narudzbe.map((narudzba, index) => {
              const kasni = narudzba.cekaDugo;
              const sljedeci = SLJEDECI_STATUS[stanica][narudzba.status];

              return (
                <li
                  key={`${narudzba.id}-${index}`}
                  className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                    kasni ? "border-amber-400" : "border-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold">{narudzba.broj}</h2>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold">
                      {stanica === "pecenjara" && narudzba.status === "U pripremi"
                        ? "Priprema"
                        : narudzba.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stampajNarudzbu(narudzba)}
                    className="mt-3 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium"
                  >
                    Štampaj narudžbu · 58 mm
                  </button>
                  {kasni && (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      Čeka 15 minuta ili duže
                    </p>
                  )}
                  <ul className="mt-4 space-y-3">
                    {narudzba.stavke_narudzbe.map((stavka, index) => (
                      <li
                        key={`${stavka.id}-${index}`}
                        className={`border-t border-stone-100 pt-3 ${
                          stavka.stornirano ? "text-stone-400 line-through" : ""
                        }`}
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">{stavka.naziv}</span>
                          <span className="shrink-0">
                            {stavka.kolicina}
                            {stavka.jedinica === "kg" ? " kg" : ""}
                          </span>
                        </div>
                        {stavka.napomena && (
                          <p className="mt-1 text-sm text-amber-800">
                            Napomena: {stavka.napomena}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  {stanica === "pecenjara" && narudzba.status === "U pripremi" && (
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm">
                        Cijena koju konobar plaća pečenjari (KM)
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={cijenePecenjare[narudzba.id] ?? ""}
                          onChange={(event) => setCijenePecenjare({
                            ...cijenePecenjare,
                            [narudzba.id]: event.target.value,
                          })}
                          className="mt-1 w-full rounded-lg border border-stone-300 p-2"
                        />
                      </label>
                      {narudzba.stavke_narudzbe.some(
                        (stavka) => stavka.jedinica === "kg" && stavka.naziv.toLocaleLowerCase("bs").includes("jagnjetina"),
                      ) && (
                        <label className="block text-sm">
                          Stvarno izdato jagnjetine (kg) — usklađuje račun gosta
                          <input
                            type="number"
                            min={0}
                            step="0.001"
                            value={kolicineJagnjetine[narudzba.id] ?? ""}
                            onChange={(event) => setKolicineJagnjetine({
                              ...kolicineJagnjetine,
                              [narudzba.id]: event.target.value,
                            })}
                            className="mt-1 w-full rounded-lg border border-stone-300 p-2"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  {sljedeci && (
                    <button
                      type="button"
                      onClick={() => void promijeniStatus(narudzba)}
                      disabled={
                        (azuriraId !== "" && azuriraId !== narudzba.id) ||
                        (stanica === "pecenjara" && sljedeci === "Gotovo" &&
                          (!cijenePecenjare[narudzba.id] ||
                            cijenePecenjare[narudzba.id].trim() === "" ||
                            (narudzba.stavke_narudzbe.some(
                              (stavka) => stavka.jedinica === "kg" && stavka.naziv.toLocaleLowerCase("bs").includes("jagnjetina"),
                            ) && (kolicineJagnjetine[narudzba.id] === undefined || kolicineJagnjetine[narudzba.id].trim() === ""))))
                      }
                      className="mt-5 min-h-11 w-full rounded-xl bg-stone-900 px-4 font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
                    >
                      {azuriraId === narudzba.id
                        ? "Ažuriram..."
                        : TEKST_DUGMETA[sljedeci]}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
