"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Stol = {
  id: number;
  naziv: string;
  racun: {
    ukupno: number;
    minute: number;
    cekaNaplatu: boolean;
  } | null;
};

type FilterStolova = "svi" | "zauzeti" | "slobodni";

const FILTERI: { id: FilterStolova; naziv: string }[] = [
  { id: "svi", naziv: "Svi" },
  { id: "zauzeti", naziv: "Zauzeti" },
  { id: "slobodni", naziv: "Slobodni" },
];

export function StoloviPregled() {
  const [stolovi, setStolovi] = useState<Stol[]>([]);
  const [filter, setFilter] = useState<FilterStolova>("svi");
  const [greska, setGreska] = useState("");
  const [ucitava, setUcitava] = useState(true);

  const ucitajStolove = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/stolovi", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Stolove nije moguće učitati.");
        return;
      }

      setStolovi(podaci.stolovi);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setUcitava(false);
    }
  }, []);

  useEffect(() => {
    const pocetnoUcitavanje = window.setTimeout(
      () => void ucitajStolove(),
      0,
    );
    const interval = window.setInterval(() => void ucitajStolove(), 5000);
    return () => {
      window.clearTimeout(pocetnoUcitavanje);
      window.clearInterval(interval);
    };
  }, [ucitajStolove]);

  const prikazaniStolovi = stolovi.filter((sto) => {
    if (filter === "zauzeti") return sto.racun !== null;
    if (filter === "slobodni") return sto.racun === null;
    return true;
  });

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-700">Smajić · Konobar</p>
            <h1 className="mt-1 text-2xl font-bold">Stolovi</h1>
          </div>
          <button
            type="button"
            onClick={() => void ucitajStolove()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50"
          >
            Osvježi
          </button>
        </header>

        <div className="my-5 flex gap-2" aria-label="Filter stolova">
          {FILTERI.map((opcija) => (
            <button
              key={opcija.id}
              type="button"
              onClick={() => setFilter(opcija.id)}
              aria-pressed={filter === opcija.id}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                filter === opcija.id
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              {opcija.naziv}
            </button>
          ))}
        </div>

        {greska && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {greska}
          </p>
        )}

        {ucitava ? (
          <p className="text-sm text-stone-600">Učitavanje stolova...</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {prikazaniStolovi.map((sto) => {
              return (
                <li key={sto.id}>
                  <Link
                    href={`/konobar/stolovi/${sto.id}`}
                    className={`flex min-h-32 flex-col justify-between rounded-2xl border-2 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 ${
                      sto.racun?.cekaNaplatu
                        ? "border-amber-400"
                        : sto.racun
                          ? "border-rose-300"
                          : "border-stone-200"
                    }`}
                  >
                    <span className="font-semibold">{sto.naziv}</span>
                    {sto.racun ? (
                      <>
                        <span className="text-xl font-bold">
                          {sto.racun.ukupno.toFixed(2)} KM
                        </span>
                        <span className="text-xs text-stone-600">
                          {sto.racun.cekaNaplatu
                            ? "Čeka naplatu"
                              : `Zauzet · ${sto.racun.minute} min`}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-emerald-700">Slobodan</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
