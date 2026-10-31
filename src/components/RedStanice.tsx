"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ikona } from "./Ikona";

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

/** Tekst dugmeta prema statusu u koji narudžba prelazi. */
const TEKST_DUGMETA: Record<StatusNarudzbe, string> = {
  Novo: "",
  "U pripremi": "Prihvati",
  Gotovo: "Označi gotovo",
  Izdato: "Izdaj",
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
  // Vrijeme posljednjeg učitavanja; minute čekanja se računaju od njega.
  const [sada, setSada] = useState(0);

  const ucitajNarudzbe = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/narudzbe", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Narudžbe nije moguće učitati.");
        return;
      }

      setNarudzbe(podaci.narudzbe);
      setSada(Date.now());
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
        !Number.isFinite(Number(unesenaJagnjetina)) || Number(unesenaJagnjetina) <= 0)) {
      setGreska("Unesite stvarnu količinu jagnjetine veću od 0 kg. Ako jagnjetina nije izdata, konobar treba stornirati stavku.");
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

  const kolone: { status: StatusNarudzbe; naziv: string; klasa: string }[] = [
    { status: "Novo", naziv: "Novo", klasa: "is-novo" },
    { status: "U pripremi", naziv: stanica === "pecenjara" ? "Priprema" : "U pripremi", klasa: "is-priprema" },
    ...(stanica === "pecenjara" ? [{ status: "Gotovo" as const, naziv: "Gotovo", klasa: "is-izdato" }] : []),
  ];
  const rasporedKolona = stanica === "kuhinja" ? "k2z" : stanica === "pecenjara" ? "k3" : "k2";
  const kasniBroj = narudzbe.filter((narudzba) => narudzba.cekaDugo).length;
  const minuta = (narudzba: Narudzba) =>
    Math.max(0, Math.floor((sada - new Date(narudzba.kreirano_at).getTime()) / 60_000));
  const imaJagnjetinu = (narudzba: Narudzba) => narudzba.stavke_narudzbe.some(
    (stavka) => stavka.jedinica === "kg" && stavka.naziv.toLocaleLowerCase("bs").includes("jagnjetina"),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{naslov}</h1>
          <p>{narudzbe.length} aktivnih narudžbi{kasniBroj > 0 ? ` · ${kasniBroj} preko 15 min` : ""}</p>
        </div>
        <div className="row wrap">
          {kolone.map((kolona) => (
            <span key={kolona.status} className={`badge ${kolona.status === "Novo" ? "badge-novo" : kolona.status === "Gotovo" ? "badge-gotovo" : "badge-priprema"}`}>
              {narudzbe.filter((narudzba) => narudzba.status === kolona.status).length} {kolona.naziv}
            </span>
          ))}
          <button type="button" onClick={() => void ucitajNarudzbe()} className="btn btn-ghost btn-sm">
            <Ikona naziv="osvjezi" /> Osvježi
          </button>
        </div>
      </div>

      {greska && (
        <div role="alert" className="alert alert-danger mb-3"><Ikona naziv="upozorenje" /><div>{greska}</div></div>
      )}

      {ucitava ? (
        <p className="muted small">Učitavanje narudžbi...</p>
      ) : (
        <div className={`kds ${rasporedKolona}`}>
          {kolone.map((kolona) => {
            const uKoloni = narudzbe.filter((narudzba) => narudzba.status === kolona.status);
            return (
              <section key={kolona.status} className={`kcol ${kolona.klasa}`}>
                <div className="kcol-head"><h3>{kolona.naziv}</h3><span className="n">{uKoloni.length}</span></div>
                <div className="kstack">
                  {uKoloni.length === 0 && <p className="tiny muted" style={{ padding: "4px" }}>Nema narudžbi.</p>}
                  {uKoloni.map((narudzba, index) => {
                    const sljedeci = SLJEDECI_STATUS[stanica][narudzba.status];
                    const trebaCijena = stanica === "pecenjara" && sljedeci === "Gotovo";
                    const jagnjetina = trebaCijena && imaJagnjetinu(narudzba);
                    const nedostajeUnos = trebaCijena && (
                      !cijenePecenjare[narudzba.id]?.trim() ||
                      (jagnjetina && !kolicineJagnjetine[narudzba.id]?.trim())
                    );
                    return (
                      <article key={`${narudzba.id}-${index}`} className={`ocard${narudzba.cekaDugo ? " is-urgent" : ""}`}>
                        <div className="ocard-top">
                          <span className="ocard-id">{narudzba.broj}</span>
                          <button type="button" onClick={() => stampajNarudzbu(narudzba)} className="ocard-tbl" aria-label={`Štampaj narudžbu ${narudzba.broj}`}>
                            Štampa 58 mm
                          </button>
                        </div>
                        <ul className="ocard-items">
                          {narudzba.stavke_narudzbe.map((stavka, stavkaIndex) => (
                            <li key={`${stavka.id}-${stavkaIndex}`} style={stavka.stornirano ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
                              <span className="q">{stavka.kolicina}{stavka.jedinica === "kg" ? " kg" : "×"}</span>
                              <span>
                                {stavka.naziv}
                                {stavka.stornirano && <span className="mod"> (storno)</span>}
                                {stavka.napomena && <span className="mod"> ({stavka.napomena})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {trebaCijena && (
                          <div className="stack-sm mb-3">
                            <div className="field">
                              <label htmlFor={`cijena-${narudzba.id}`}>Cijena za konobara (KM)</label>
                              <input
                                id={`cijena-${narudzba.id}`}
                                type="number"
                                min={0}
                                step="0.01"
                                value={cijenePecenjare[narudzba.id] ?? ""}
                                onChange={(event) => setCijenePecenjare({ ...cijenePecenjare, [narudzba.id]: event.target.value })}
                                className="input amount"
                              />
                            </div>
                            {jagnjetina && (
                              <div className="field">
                                <label htmlFor={`jagnjetina-${narudzba.id}`}>Stvarno izdato jagnjetine (kg)</label>
                                <input
                                  id={`jagnjetina-${narudzba.id}`}
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={kolicineJagnjetine[narudzba.id] ?? ""}
                                  onChange={(event) => setKolicineJagnjetine({ ...kolicineJagnjetine, [narudzba.id]: event.target.value })}
                                  className="input amount"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="ocard-foot">
                          <span className={`ocard-time${narudzba.cekaDugo ? " late" : ""}`}>{minuta(narudzba)} min</span>
                          {sljedeci && (
                            <button
                              type="button"
                              onClick={() => void promijeniStatus(narudzba)}
                              disabled={(azuriraId !== "" && azuriraId !== narudzba.id) || nedostajeUnos}
                              className={`btn btn-sm ${narudzba.status === "Novo" ? "btn-primary" : "btn-soft"}`}
                            >
                              {azuriraId === narudzba.id ? "Ažuriram..." : TEKST_DUGMETA[sljedeci]}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {stanica === "kuhinja" && (
            <aside id="zbirno" className="sum-panel">
              <div className="panel-head"><h2>Zbirno</h2><span className="count">na čekanju</span></div>
              {zbirno.length ? (
                <ul className="sum-list">
                  {zbirno.map((stavka) => (
                    <li key={stavka.naziv}><span>{stavka.naziv}</span><span className="n">{stavka.kolicina}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="small muted">Nema jela na čekanju.</p>
              )}
              <div className="formula mt-3">
                <span className="fx">Sosovi se ne računaju u zbirno</span>
                <span className="fnote">Sabiraju se samo jela i prilozi koji se stvarno pripremaju.</span>
              </div>
            </aside>
          )}
        </div>
      )}

      <div className="alert alert-info mt-4">
        <Ikona naziv="info" />
        <div>Žuti rub na kartici znači da narudžba čeka 15 minuta ili duže. Ekran ostaje upaljen dok je stanica aktivna.</div>
      </div>
    </>
  );
}
