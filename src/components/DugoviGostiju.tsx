"use client";

import { useCallback, useEffect, useState } from "react";

type Dug = {
  id: string;
  broj: number;
  duznik: string;
  konobar: string;
  kreirano: string;
  iznos: number;
};

export function DugoviGostiju() {
  const [dugovi, setDugovi] = useState<Dug[]>([]);
  const [nacin, setNacin] = useState<Record<string, "gotovina" | "kartica">>({});
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/administracija/dugovi", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Dugove gostiju nije moguće učitati.");
        return;
      }
      setDugovi(body.dugovi);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  async function naplati(racunId: string, iznos: number, duznik: string) {
    if (!window.confirm(`Evidentirati naplatu duga od ${iznos.toFixed(2)} KM za ${duznik}?`)) return;
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/administracija/dugovi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ racunId, nacin: nacin[racunId] ?? "gotovina" }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Naplatu duga nije moguće evidentirati.");
        return;
      }
      setPoruka(`Dug gosta ${duznik} (${iznos.toFixed(2)} KM) je naplaćen.`);
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <section className="card card-pad mt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Dugovi gostiju</h2>
        <button type="button" onClick={() => void ucitaj()} className="btn-link">Osvježi</button>
      </div>
      {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
      {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}
      {dugovi.length === 0 ? <p className="small muted mt-3">Nema otvorenih dugova.</p> : (
        <ul className="mt-3 space-y-2">
          {dugovi.map((dug) => (
            <li key={dug.id} className="debt grid items-center gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <span><strong>{dug.duznik}</strong><span className="block text-xs text-stone-500">Račun #{dug.broj} · konobar {dug.konobar} · {dug.kreirano ? new Date(dug.kreirano).toLocaleDateString("bs-BA") : ""}</span></span>
              <strong>{dug.iznos.toFixed(2)} KM</strong>
              <select aria-label={`Način naplate duga ${dug.duznik}`} value={nacin[dug.id] ?? "gotovina"} onChange={(event) => setNacin({ ...nacin, [dug.id]: event.target.value as "gotovina" | "kartica" })} className="input"><option value="gotovina">Gotovina</option><option value="kartica">Kartica</option></select>
              <button type="button" disabled={radi} onClick={() => void naplati(dug.id, dug.iznos, dug.duznik)} className="btn btn-primary btn-sm">Naplaćeno</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
