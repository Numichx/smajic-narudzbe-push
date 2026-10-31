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
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">Moja statistika</h1>
        <label className="mt-4 inline-block text-sm">Period<select value={dani} onChange={(event) => setDani(event.target.value)} className="ml-2 rounded-lg border border-stone-300 bg-white p-2"><option value="1">Danas</option><option value="7">7 dana</option><option value="30">30 dana</option></select></label>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {statistika && <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ["Konobar", statistika.ime],
          ["Računi", String(statistika.brojRacuna)],
          ["Naplaceno", `${statistika.naplaceno.toFixed(2)} KM`],
          ["Dug gostiju", `${statistika.dug.toFixed(2)} KM`],
          ["Prosječan račun", `${statistika.prosjecanRacun.toFixed(2)} KM`],
          ["Bakšiš (vidi samo konobar)", `${statistika.baksis.toFixed(2)} KM`],
        ].map(([label, value]) => <article key={label} className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-sm text-stone-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}</section>}
      </div>
    </main>
  );
}
