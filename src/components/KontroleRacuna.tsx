"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatirajRacun58mm } from "@/lib/print/racun58mm";
import { Ikona } from "./Ikona";

type Stavka = {
  id: string;
  naziv: string;
  jedinica: string;
  kolicina: number;
  cijena: number;
  prilozi: { naziv: string; cijena: number; kolicina?: number; poseban?: boolean }[];
  napomena: string | null;
  stornirano: boolean;
  storno_razlog: string | null;
};

type Racun = {
  id: string;
  broj: number;
  ukupno: number;
  sveIzdato: boolean;
  stolovi: { id: number; naziv: string }[];
  narudzbe: {
    id: string;
    broj: string;
    status: string;
    stavke_narudzbe: Stavka[];
  }[];
};

const RAZLOZI = ["Pogrešan unos", "Gost odustao", "Greška kuhinje", "Drugo"] as const;

export function KontroleRacuna({ stoId }: { stoId: number }) {
  const [racun, setRacun] = useState<Racun | null>(null);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [ucitava, setUcitava] = useState(true);
  const [gostDao, setGostDao] = useState("");
  const [vraceniKusur, setVraceniKusur] = useState("");
  const [nacin, setNacin] = useState<"gotovina" | "kartica" | "kombinovano" | "dug">("gotovina");
  const [duznik, setDuznik] = useState("");
  const [podijeljenoNa, setPodijeljenoNa] = useState("");
  const [odabraniRazlog, setOdabraniRazlog] = useState<Record<string, string>>({});
  const [stoU, setStoU] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch(`/api/racuni/sto/${stoId}`, { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Račun nije moguće učitati.");
        return;
      }
      setRacun(podaci.racun);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom pri učitavanju računa.");
    } finally {
      setUcitava(false);
    }
  }, [stoId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    const interval = window.setInterval(() => void ucitaj(), 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [ucitaj]);

  const stavke = useMemo(
    () => racun?.narudzbe.flatMap((narudzba) => narudzba.stavke_narudzbe) ?? [],
    [racun],
  );
  const kusurOcekivan = Math.max(0, Number(gostDao || 0) - (racun?.ukupno ?? 0));

  async function posalji(url: string, tijelo: unknown) {
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tijelo),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Operacija nije uspjela.");
        return false;
      }
      setPoruka("Promjena je sačuvana.");
      await ucitaj();
      return true;
    } catch {
      setGreska("Nema veze sa serverom.");
      return false;
    } finally {
      setRadi(false);
    }
  }

  async function naplati() {
    if (!racun) return;
    const dao = nacin === "dug" ? 0 : Number(gostDao);
    const kusur = nacin === "dug" ? 0 : Number(vraceniKusur || 0);
    if (nacin !== "dug" && (!Number.isFinite(dao) || dao < racun.ukupno)) {
      setGreska("Iznos koji je gost dao mora pokriti račun.");
      return;
    }
    if (nacin !== "dug" && kusur > dao - racun.ukupno) {
      setGreska("Vraćeni kusur ne može biti veći od mogućeg kusura.");
      return;
    }
    const uspjelo = await posalji(`/api/racuni/${racun.id}/naplata`, {
      gostDao: dao,
      vraceniKusur: kusur,
      nacin,
      gostDuznik: nacin === "dug" ? duznik : undefined,
      podijeljenoNa: podijeljenoNa ? Number(podijeljenoNa) : undefined,
    });
    if (uspjelo) {
      setRacun(null);
      setGostDao("");
      setVraceniKusur("");
      setDuznik("");
      setPodijeljenoNa("");
      setNacin("gotovina");
      setPoruka("Račun je naplaćen i zatvoren.");
    }
  }

  function stampajRacun() {
    if (!racun) return;
    const prozor = window.open("", "_blank", "width=360,height=640");
    if (!prozor) {
      setGreska("Preglednik je blokirao prozor za štampu. Dozvolite iskačuće prozore.");
      return;
    }
    const stavkeZaStampu = stavke
      .filter((stavka) => !stavka.napomena?.startsWith("Prilog uz ") && !stavka.stornirano)
      .map((stavka) => ({
        naziv: [
          stavka.naziv,
          ...stavka.prilozi.map((prilog) => `${prilog.naziv}${prilog.poseban ? " ★" : ""}`),
        ].join(" / "),
        kolicina: stavka.kolicina,
        ukupno: stavka.cijena * stavka.kolicina +
          stavka.prilozi.reduce((sum, prilog) => sum + prilog.cijena, 0),
      }));
    const tekst = formatirajRacun58mm({
      nazivRestorana: "Restoran Smajić",
      brojRacuna: String(racun.broj),
      stavke: stavkeZaStampu,
      ukupno: racun.ukupno,
    });
    prozor.document.title = `Račun ${racun.broj}`;
    const stil = prozor.document.createElement("style");
    stil.textContent = "@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font: 12px monospace; white-space: pre-wrap; }";
    const sadrzaj = prozor.document.createElement("pre");
    sadrzaj.textContent = tekst;
    prozor.document.head.append(stil);
    prozor.document.body.append(sadrzaj);
    prozor.focus();
    prozor.print();
  }

  if (ucitava) return <p className="muted small">Učitavanje računa...</p>;
  if (!racun) {
    return (
      <section className="card">
        <div className="card-head"><h2>Otvoreni račun</h2></div>
        <div className="card-body">
          <p className="small muted">Na ovom stolu još nema otvorenog računa.</p>
          {greska && <div role="alert" className="alert alert-danger mt-3"><div>{greska}</div></div>}
          {poruka && <div role="status" className="alert alert-ok mt-3"><div>{poruka}</div></div>}
        </div>
      </section>
    );
  }

  return (
    <div className="pay-layout">
      <div className="stack">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Račun #{racun.broj}</h2>
              <p className="sub">Stolovi: {racun.stolovi.map((sto) => sto.naziv).join(", ")}</p>
            </div>
            <div className="row">
              <button type="button" onClick={stampajRacun} className="btn btn-ghost btn-sm">
                <Ikona naziv="stampa" /> 58 mm
              </button>
              <button type="button" onClick={() => void ucitaj()} className="btn btn-ghost btn-sm" aria-label="Osvježi račun">
                <Ikona naziv="osvjezi" />
              </button>
            </div>
          </div>
          <div className="card-body">
            {racun.narudzbe.map((narudzba) => (
              <div key={narudzba.id} className="mb-3">
                <div className="row-between">
                  <span className="tiny bold muted">{narudzba.broj}</span>
                  <span className={`badge ${narudzba.status === "Izdato" ? "badge-izdato" : narudzba.status === "Novo" ? "badge-novo" : "badge-priprema"}`}>
                    {narudzba.status}
                  </span>
                </div>
                {narudzba.stavke_narudzbe
                  .filter((stavka) => !stavka.napomena?.startsWith("Prilog uz "))
                  .map((stavka) => (
                    <div key={stavka.id} className="rline">
                      <span className="q">{stavka.kolicina}{stavka.jedinica === "kg" ? "" : "×"}</span>
                      <div className="body">
                        <div className="nm" style={stavka.stornirano ? { textDecoration: "line-through", color: "var(--muted-2)" } : undefined}>
                          {stavka.naziv}{stavka.jedinica === "kg" ? " (kg)" : ""}
                        </div>
                        {stavka.prilozi.map((prilog, index) => (
                          <div key={`${stavka.id}-${index}`} className="mod">
                            Prilog: {prilog.naziv}{prilog.poseban ? " ★" : ""}{prilog.cijena > 0 ? ` · ${prilog.cijena.toFixed(2)} KM` : " · uključeno"}
                          </div>
                        ))}
                        {stavka.stornirano && <div className="mod" style={{ color: "var(--orange)" }}>Storno: {stavka.storno_razlog}</div>}
                        {!stavka.stornirano && (
                          <div className="row mt-2" style={{ gap: 6 }}>
                            <select
                              aria-label={`Razlog storna za ${stavka.naziv}`}
                              value={odabraniRazlog[stavka.id] ?? RAZLOZI[0]}
                              onChange={(event) => setOdabraniRazlog({ ...odabraniRazlog, [stavka.id]: event.target.value })}
                              className="input"
                              style={{ height: 30, fontSize: "var(--fs-11)", maxWidth: 160 }}
                            >
                              {RAZLOZI.map((razlog) => <option key={razlog}>{razlog}</option>)}
                            </select>
                            <button
                              type="button"
                              disabled={radi}
                              onClick={() => void posalji(`/api/narudzbe/stavka/${stavka.id}/storno`, {
                                razlog: odabraniRazlog[stavka.id] ?? RAZLOZI[0],
                              })}
                              className="btn btn-warn btn-sm"
                            >
                              <Ikona naziv="storno" /> Storno
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="amt">{stavka.stornirano ? "0,00" : (stavka.cijena * stavka.kolicina).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <h2 className="section-title">Premjesti, spoji ili podijeli sto</h2>
          <p className="section-sub mt-1">Ako je ciljni sto zauzet, „Premjesti / spoji” spaja račune. „Dodaj sto” dodaje sto ovom računu bez spajanja.</p>
          <div className="row wrap mt-3">
            <select value={stoU} onChange={(event) => setStoU(event.target.value)} className="input grow" style={{ minWidth: 160 }}>
              <option value="">Odaberi ciljni sto</option>
              {Array.from({ length: 20 }, (_, index) => index + 1)
                .filter((id) => !racun.stolovi.some((sto) => sto.id === id))
                .map((id) => <option key={id} value={id}>Sto {id}</option>)}
            </select>
            <button
              type="button"
              disabled={!stoU || radi}
              onClick={async () => {
                const ok = await posalji("/api/stolovi/transfer", { stoIz: stoId, stoU: Number(stoU) });
                if (ok) setStoU("");
              }}
              className="btn btn-ghost"
            >
              <Ikona naziv="prebaci" /> Premjesti / spoji
            </button>
            <button
              type="button"
              disabled={!stoU || radi}
              onClick={async () => {
                const ok = await posalji("/api/stolovi/transfer", {
                  stoIz: stoId,
                  stoU: Number(stoU),
                  podijeliRacunId: racun.id,
                });
                if (ok) setStoU("");
              }}
              className="btn btn-ghost"
            >
              Dodaj sto na račun
            </button>
          </div>
        </section>
      </div>

      <aside className="pay-panel">
        <div className="pay-total">
          <span>Za naplatu</span>
          <b>{racun.ukupno.toFixed(2)} KM</b>
        </div>
        <div className="field">
          <label htmlFor="nacin-naplate">Način naplate</label>
          <select id="nacin-naplate" value={nacin} onChange={(event) => setNacin(event.target.value as typeof nacin)} className="input">
            <option value="gotovina">Gotovina</option>
            <option value="kartica">Kartica</option>
            <option value="kombinovano">Kombinovano</option>
            <option value="dug">Na dug</option>
          </select>
        </div>
        {nacin === "dug" ? (
          <div className="field mt-3">
            <label htmlFor="duznik">Ime dužnika</label>
            <input id="duznik" value={duznik} onChange={(event) => setDuznik(event.target.value)} className="input" />
          </div>
        ) : (
          <>
            <div className="field mt-3">
              <label htmlFor="gost-dao">Gost dao (KM)</label>
              <input id="gost-dao" type="number" min={0} step="0.01" value={gostDao} onChange={(event) => setGostDao(event.target.value)} className="input amount" />
            </div>
            <div className="field mt-3">
              <label htmlFor="kusur">Vraćeni kusur (najviše {kusurOcekivan.toFixed(2)} KM)</label>
              <input id="kusur" type="number" min={0} step="0.01" value={vraceniKusur} onChange={(event) => setVraceniKusur(event.target.value)} className="input amount" />
            </div>
          </>
        )}
        <div className="field mt-3">
          <label htmlFor="broj-osoba">Broj osoba (neobavezno)</label>
          <input id="broj-osoba" type="number" min={1} max={100} value={podijeljenoNa} onChange={(event) => setPodijeljenoNa(event.target.value)} className="input" />
        </div>
        <div className="kv mt-3">
          {nacin !== "dug" && <div><span className="k">Kusur</span><span className="v">{kusurOcekivan.toFixed(2)} KM</span></div>}
          {podijeljenoNa && Number(podijeljenoNa) > 0 && (
            <div><span className="k">Po osobi</span><span className="v">{(racun.ukupno / Number(podijeljenoNa)).toFixed(2)} KM</span></div>
          )}
        </div>
        {!racun.sveIzdato && (
          <div className="alert alert-warn mt-3"><Ikona naziv="upozorenje" /><div>Naplata je dostupna kada sve stanice izdaju narudžbe.</div></div>
        )}
        {greska && <div role="alert" className="alert alert-danger mt-3"><div>{greska}</div></div>}
        {poruka && <div role="status" className="alert alert-ok mt-3"><div>{poruka}</div></div>}
        <div className="pay-actions">
          <button type="button" disabled={radi || !racun.sveIzdato} onClick={() => void naplati()} className="btn btn-primary btn-lg btn-block">
            Naplati {racun.ukupno.toFixed(2)} KM
          </button>
        </div>
        <p className="sr-only">{stavke.length} stavki na računu</p>
      </aside>
    </div>
  );
}
