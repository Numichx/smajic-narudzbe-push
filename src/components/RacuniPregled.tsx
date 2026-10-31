"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Racun = {
  id: string;
  broj: number;
  stoId: number;
  stolovi: { id: number; naziv: string }[];
  konobar: string;
  otvorenAt: string;
  minute: number;
  ukupno: number;
  podijeljenoNa: number | null;
  cekaNaplatu: boolean;
};

export function RacuniPregled() {
  const [racuni, setRacuni] = useState<Racun[]>([]);
  const [greska, setGreska] = useState("");

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/racuni", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Račune nije moguće učitati.");
        return;
      }
      setRacuni(body.racuni);
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

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/konobar/stolovi" className="text-sm text-amber-800 hover:underline">← Stolovi</Link>
        <h1 className="mt-1 text-2xl font-bold">Otvoreni računi</h1>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {racuni.length === 0 && !greska ? <p className="mt-4 rounded-xl bg-white p-4 text-sm">Nema otvorenih računa.</p> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {racuni.map((racun) => (
              <li key={racun.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex justify-between gap-2"><strong>Račun #{racun.broj}</strong><span className="text-sm">{racun.ukupno.toFixed(2)} KM</span></div>
                <p className="mt-2 text-sm text-stone-600">{racun.stolovi.map((sto) => sto.naziv).join(", ")} · {racun.konobar}</p>
                <p className="mt-1 text-xs text-stone-500">{racun.cekaNaplatu ? "Čeka naplatu" : `Otvoren ${racun.minute} min`}{racun.podijeljenoNa ? ` · ${racun.podijeljenoNa} osoba` : ""}</p>
                <Link href={`/konobar/stolovi/${racun.stoId}`} className="mt-3 inline-block rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white">Otvori račun</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
