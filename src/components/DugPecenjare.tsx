"use client";

import { useCallback, useEffect, useState } from "react";

type Dug = { ime: string; izdato: number; placeno: number; dug: number };

export function DugPecenjare() {
  const [dugovi, setDugovi] = useState<Dug[]>([]);
  const [iznosi, setIznosi] = useState<Record<string, string>>({});
  const [greska, setGreska] = useState("");
  // Greška učitavanja je odvojena: osvježavanje ne smije brisati poruku o radnji.
  const [greskaUcitavanja, setGreskaUcitavanja] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/pecenjara/dug", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreskaUcitavanja(body.greska ?? "Dugovanja nije moguće učitati.");
        return;
      }
      setDugovi(body.dugovi);
      setGreskaUcitavanja("");
    } catch {
      setGreskaUcitavanja("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    const interval = window.setInterval(() => void ucitaj(), 10_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [ucitaj]);

  async function evidentiraj(ime: string) {
    const iznos = Number(iznosi[ime]);
    if (!Number.isFinite(iznos) || iznos <= 0) {
      setGreska("Unesite iznos uplate veći od nule.");
      return;
    }
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/pecenjara/dug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konobarIme: ime, iznos }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Uplatu nije moguće evidentirati.");
        return;
      }
      setPoruka(`Uplata ${iznos.toFixed(2)} KM je evidentirana od ${ime}.`);
      setIznosi({ ...iznosi, [ime]: "" });
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <section className="contents">
      <div className="card card-pad">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">Dug konobara pečenjari</h2>
          <button type="button" onClick={() => void ucitaj()} className="btn-link">Osvježi</button>
        </div>
        {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
        {greskaUcitavanja && <p role="alert" className="alert alert-danger mt-3">{greskaUcitavanja}</p>}
        {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}
        {dugovi.length === 0 ? <p className="small muted mt-3">Nema evidentiranih izdatih narudžbi.</p> : (
          <ul className="mt-3 space-y-3">
            {dugovi.map((red) => (
              <li key={red.ime} className="debt grid items-center gap-2 sm:grid-cols-[1fr_auto_10rem_auto]">
                <strong>{red.ime}</strong>
                <span className="small muted">Izdato {red.izdato.toFixed(2)} · plaćeno {red.placeno.toFixed(2)} · dug <b>{red.dug.toFixed(2)} KM</b></span>
                {red.dug > 0 && <>
                  <input aria-label={`Uplata od ${red.ime}`} type="number" min="0.01" max={red.dug} step="0.01" value={iznosi[red.ime] ?? ""} onChange={(event) => setIznosi({ ...iznosi, [red.ime]: event.target.value })} placeholder="Uplata KM" className="input" />
                  <button type="button" disabled={radi} onClick={() => void evidentiraj(red.ime)} className="btn btn-primary btn-sm">Platio X</button>
                </>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
