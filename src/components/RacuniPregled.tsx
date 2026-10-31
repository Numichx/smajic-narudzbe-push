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
    <main className="contents">
      <div className="contents">
        <Link href="/konobar/stolovi" className="btn-link">← Stolovi</Link>
        <h1 className="page-title mt-1">Otvoreni računi</h1>
        {greska && <p role="alert" className="alert alert-danger mt-4">{greska}</p>}
        {racuni.length === 0 && !greska ? <p className="card card-pad mt-4 small">Nema otvorenih računa.</p> : (
          <ul className="kpi-row mt-4">
            {racuni.map((racun) => (
              <li key={racun.id} className="card card-pad">
                <div className="flex justify-between gap-2"><strong>Račun #{racun.broj}</strong><span className="text-sm">{racun.ukupno.toFixed(2)} KM</span></div>
                <p className="small muted mt-2">{racun.stolovi.map((sto) => sto.naziv).join(", ")} · {racun.konobar}</p>
                <p className="tiny muted mt-1">{racun.cekaNaplatu ? "Čeka naplatu" : `Otvoren ${racun.minute} min`}{racun.podijeljenoNa ? ` · ${racun.podijeljenoNa} osoba` : ""}</p>
                <Link href={`/konobar/stolovi/${racun.stoId}`} className="btn btn-primary btn-sm mt-3">Otvori račun</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
