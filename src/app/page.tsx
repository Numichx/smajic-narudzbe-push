import type { ReactNode } from "react";
import Link from "next/link";

type Uloga = {
  id: string;
  naziv: string;
  opis: string;
  ikona: ReactNode;
};

const ULOGE: Uloga[] = [
  { id: "konobar", naziv: "Konobar", opis: "Stolovi, narudžbe, naplata", ikona: <><path d="M4 9h16v3H4z" /><path d="M6 12v8m12-8v8M4 20h16" /></> },
  { id: "kuhinja", naziv: "Kuhinja", opis: "Narudžbe i zbirno", ikona: <><path d="M5 5h14v4H5zm0 7h14v7H5z" /><path d="M8 14h5m-5 3h8" /></> },
  { id: "pecenjara", naziv: "Pečenjara", opis: "Pečenja i dug konobara", ikona: <><path d="M12 3c-3 4-5 6-5 10a5 5 0 0 0 10 0c0-2-1-4-3-6 0 3-2 4-2 4s1-4 0-8z" /></> },
  { id: "sank", naziv: "Šank", opis: "Pića, popis, dopune", ikona: <><path d="M5 4h14l-2 16H7z" /><path d="M7 8h10m-9 4h8" /></> },
  { id: "mesnica", naziv: "Mesnica", opis: "Zahtjevi i isporuke", ikona: <><path d="M4 17 17 4l3 3L7 20H4z" /><path d="m13 8 3 3" /></> },
  { id: "sefica", naziv: "Šefica", opis: "Izvještaji i postavke", ikona: <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2" /></> },
];

export default function Pocetna() {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-9 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-500 text-base font-bold text-white">S</span>
            <span>
              <span className="block font-bold leading-tight">Smajić</span>
              <span className="block text-xs font-medium tracking-[0.16em] text-stone-500">POS · ROŠTILJ &amp; KUHINJA</span>
            </span>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-500 ring-1 ring-stone-200">
            Jedan uređaj · jedna uloga
          </span>
        </header>

        <section className="mb-7 max-w-xl">
          <p className="text-sm font-semibold text-amber-700">Dobro došli</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Odaberi ulogu uređaja</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
            Svaki uređaj otvara jednu ulogu. Podaci se dijele u realnom vremenu između stanica.
          </p>
        </section>

        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ULOGE.map((uloga) => (
            <li key={uloga.id}>
              <Link
                href={`/login?uloga=${uloga.id}`}
                className="group flex min-h-32 flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-100">
                  <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {uloga.ikona}
                  </svg>
                </span>
                <span className="mt-3 font-bold text-stone-900">{uloga.naziv}</span>
                <span className="mt-1 text-xs text-stone-500">{uloga.opis}</span>
              </Link>
            </li>
          ))}
        </ul>

        <footer className="mt-8 flex items-center justify-between border-t border-stone-200 pt-4 text-xs text-stone-500">
          <span>Smajić POS</span>
          <span>Prijavite se odabirom svoje uloge</span>
        </footer>
      </div>
    </main>
  );
}
