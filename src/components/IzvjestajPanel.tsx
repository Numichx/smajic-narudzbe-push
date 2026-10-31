"use client";

import { useCallback, useEffect, useState } from "react";

type Izvjestaj = {
  naplaceno: number;
  naruceno: number;
  prosjecan_racun: number;
  dug: number;
  racuni: number;
  baksis: number;
  otvoreni_racuni: number;
  hrana: number;
  pice: number;
  prilozi_ukupno: number;
  prosjek_vrijeme_izdavanja_minuta: number;
  marza_pecenjare: number;
  po_konobaru: { ime: string; naplaceno: number; baksis: number; broj_racuna: number }[];
  po_proizvodu: { naziv: string; kolicina: number; promet: number }[];
  po_smjeni: {
    id: string;
    oznaka: string;
    preuzeo_ime: string;
    pocetak_at: string;
    predani_pazar: number | null;
    naplaceno: number;
  }[];
};

function novac(iznos: number) {
  return `${Number(iznos ?? 0).toFixed(2)} KM`;
}

export function IzvjestajPanel() {
  const [dani, setDani] = useState("1");
  const [izvjestaj, setIzvjestaj] = useState<Izvjestaj | null>(null);
  const [greska, setGreska] = useState("");

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch(`/api/izvjestaji?dani=${dani}`, { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Izvještaj nije moguće učitati.");
        return;
      }
      setIzvjestaj(podaci.izvjestaj);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, [dani]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  function preuzmiCsv() {
    if (!izvjestaj) return;
    const redovi = [
      ["Vrsta", "Naziv", "Iznos", "Broj"],
      ["Sažetak", "Naplaceno", String(izvjestaj.naplaceno), String(izvjestaj.racuni)],
      ["Sažetak", "Naručeno", String(izvjestaj.naruceno), ""],
      ["Sažetak", "Dug", String(izvjestaj.dug), ""],
      ["Sažetak", "Bakšiš", String(izvjestaj.baksis), ""],
      ...izvjestaj.po_konobaru.map((red) => ["Konobar", red.ime, String(red.naplaceno), String(red.broj_racuna)]),
      ...izvjestaj.po_proizvodu.map((red) => ["Proizvod", red.naziv, String(red.promet), String(red.kolicina)]),
    ];
    const csv = `\uFEFF${redovi.map((red) => red.map((polje) => `"${polje.replaceAll('"', '""')}"`).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `izvjestaj-${dani}-dana.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-amber-700">Smajić · Šefica</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Izvještaji</h1>
          <div className="flex gap-2">
            <select value={dani} onChange={(event) => setDani(event.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
              <option value="1">Danas</option><option value="7">7 dana</option><option value="30">30 dana</option>
            </select>
            <button type="button" onClick={preuzmiCsv} disabled={!izvjestaj} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">CSV</button>
          </div>
        </div>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {!izvjestaj ? <p className="mt-5 text-sm text-stone-600">Učitavanje izvještaja...</p> : (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Naplaceno", novac(izvjestaj.naplaceno)],
                ["Naručeno", novac(izvjestaj.naruceno)],
                ["Dug gostiju", novac(izvjestaj.dug)],
                ["Broj računa", String(izvjestaj.racuni)],
                ["Prosječan račun", novac(izvjestaj.prosjecan_racun)],
                ["Bakšiš", novac(izvjestaj.baksis)],
                ["Otvoreni računi sada", String(izvjestaj.otvoreni_racuni)],
                ["Hrana", novac(izvjestaj.hrana)],
                ["Piće", novac(izvjestaj.pice)],
                ["Prilozi", novac(izvjestaj.prilozi_ukupno)],
                ["Prosječno do izdavanja", `${Number(izvjestaj.prosjek_vrijeme_izdavanja_minuta).toFixed(1)} min`],
                ["Marža pečenjare", novac(izvjestaj.marza_pecenjare)],
              ].map(([label, value]) => <article key={label} className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-sm text-stone-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>)}
            </section>
            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-stone-200 bg-white p-4">
                <h2 className="font-bold">Promet po konobaru</h2>
                <ul className="mt-3 divide-y divide-stone-100">
                  {izvjestaj.po_konobaru.map((red) => <li key={red.ime} className="flex justify-between gap-3 py-2 text-sm"><span>{red.ime} · {red.broj_racuna} računa</span><strong>{novac(red.naplaceno)}</strong></li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-stone-200 bg-white p-4">
                <h2 className="font-bold">Pazar po smjeni</h2>
                <ul className="mt-3 divide-y divide-stone-100">
                  {izvjestaj.po_smjeni.map((red) => <li key={red.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span>{red.oznaka} · {red.preuzeo_ime} · {new Date(red.pocetak_at).toLocaleDateString("bs-BA")}</span><span>Naplaceno {novac(red.naplaceno)} · predano {novac(red.predani_pazar ?? 0)}</span></li>)}
                </ul>
              </article>
              <article className="rounded-xl border border-stone-200 bg-white p-4">
                <h2 className="font-bold">Najprodavaniji artikli</h2>
                <ul className="mt-3 divide-y divide-stone-100">
                  {izvjestaj.po_proizvodu.map((red) => <li key={red.naziv} className="flex justify-between gap-3 py-2 text-sm"><span>{red.naziv} · {red.kolicina}</span><strong>{novac(red.promet)}</strong></li>)}
                </ul>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
