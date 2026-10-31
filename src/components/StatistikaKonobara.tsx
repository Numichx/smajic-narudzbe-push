"use client";

import { useCallback, useEffect, useState } from "react";

type Statistika = {
  ime: string;
  brojRacuna: number;
  naplaceno: number;
  dug: number;
  prosjecanRacun: number;
  baksis: number;
};

export function StatistikaKonobara() {
  const [dani, setDani] = useState("1");
  const [statistika, setStatistika] = useState<Statistika | null>(null);
  const [greska, setGreska] = useState("");
  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch(`/api/statistika-konobara?dani=${dani}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Statistiku nije moguće učitati.");
        return;
      }
      setStatistika(body);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, [dani]);
  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);
  return (
    <main className="contents">
      <div className="contents">
        <h1 className="page-title">Moja statistika</h1>
        <label className="pole mt-4">Period<select value={dani} onChange={(event) => setDani(event.target.value)} className="input w-auto"><option value="1">Danas</option><option value="7">7 dana</option><option value="30">30 dana</option></select></label>
        {greska && <p role="alert" className="alert alert-danger mt-4">{greska}</p>}
        {statistika && <section className="kpi-row mt-4">{[
          ["Konobar", statistika.ime],
          ["Računi", String(statistika.brojRacuna)],
          ["Naplaceno", `${statistika.naplaceno.toFixed(2)} KM`],
          ["Dug gostiju", `${statistika.dug.toFixed(2)} KM`],
          ["Prosječan račun", `${statistika.prosjecanRacun.toFixed(2)} KM`],
          ["Bakšiš (vidi samo konobar)", `${statistika.baksis.toFixed(2)} KM`],
        ].map(([label, value]) => <article key={label} className="kpi"><p className="label">{label}</p><p className="value">{value}</p></article>)}</section>}
      </div>
    </main>
  );
}
