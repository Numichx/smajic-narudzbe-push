"use client";

import { useCallback, useEffect, useState } from "react";

type Dug = { ime: string; izdato: number; placeno: number; dug: number };

export function DugPecenjare() {
  const [dugovi, setDugovi] = useState<Dug[]>([]);
  const [iznosi, setIznosi] = useState<Record<string, string>>({});
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/pecenjara/dug", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Dugovanja nije moguće učitati.");
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
    <section className="mx-auto mb-6 w-full max-w-6xl px-4">
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Dug konobara pečenjari</h2>
          <button type="button" onClick={() => void ucitaj()} className="text-sm underline">Osvježi</button>
        </div>
        {greska && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{greska}</p>}
        {poruka && <p role="status" className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{poruka}</p>}
        {dugovi.length === 0 ? <p className="mt-3 text-sm text-stone-600">Nema evidentiranih izdatih narudžbi.</p> : (
          <ul className="mt-3 space-y-3">
            {dugovi.map((red) => (
              <li key={red.ime} className="grid items-center gap-2 rounded-lg border border-stone-100 p-3 sm:grid-cols-[1fr_auto_10rem_auto]">
                <strong>{red.ime}</strong>
                <span className="text-sm text-stone-600">Izdato {red.izdato.toFixed(2)} · plaćeno {red.placeno.toFixed(2)} · dug <b>{red.dug.toFixed(2)} KM</b></span>
                {red.dug > 0 && <>
                  <input aria-label={`Uplata od ${red.ime}`} type="number" min="0.01" max={red.dug} step="0.01" value={iznosi[red.ime] ?? ""} onChange={(event) => setIznosi({ ...iznosi, [red.ime]: event.target.value })} placeholder="Uplata KM" className="rounded-lg border border-stone-300 p-2 text-sm" />
                  <button type="button" disabled={radi} onClick={() => void evidentiraj(red.ime)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Platio X</button>
                </>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
