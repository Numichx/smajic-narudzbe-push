"use client";

import { useCallback, useEffect, useState } from "react";

type Zaposlenik = {
  id: string;
  ime: string;
  uloga: string;
  aktivan: boolean;
};

const ULOGE = [
  ["konobar", "Konobar"],
  ["kuhinja", "Kuhinja"],
  ["pecenjara", "Pečenjara"],
  ["sank", "Šank"],
  ["mesnica", "Mesnica"],
  ["sefica", "Šefica"],
] as const;

export function OsobljePanel() {
  const [zaposlenici, setZaposlenici] = useState<Zaposlenik[]>([]);
  const [ime, setIme] = useState("");
  const [uloga, setUloga] = useState<(typeof ULOGE)[number][0]>("konobar");
  const [pin, setPin] = useState("");
  const [uredjuje, setUredjuje] = useState<Zaposlenik | null>(null);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/administracija/zaposlenici", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Osoblje nije moguće učitati.");
        return;
      }
      setZaposlenici(body.zaposlenici);
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  async function sacuvaj(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/administracija/zaposlenici", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: uredjuje?.id, ime, uloga, pin }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Zaposlenika nije moguće sačuvati.");
        return;
      }
      setPoruka(uredjuje ? "Podaci zaposlenika su izmijenjeni." : "Zaposlenik je dodan.");
      setIme("");
      setPin("");
      setUredjuje(null);
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  async function postaviAktivnost(zaposlenik: Zaposlenik) {
    setRadi(true);
    setGreska("");
    try {
      const response = await fetch("/api/administracija/zaposlenici", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: zaposlenik.id, aktivan: !zaposlenik.aktivan }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Status zaposlenika nije moguće promijeniti.");
        return;
      }
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-bold">Osoblje</h2>
      {greska && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{greska}</p>}
      {poruka && <p role="status" className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{poruka}</p>}
      <form onSubmit={(event) => void sacuvaj(event)} className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="text-sm">Ime<input required minLength={2} maxLength={80} value={ime} onChange={(event) => setIme(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
        <label className="text-sm">Uloga<select value={uloga} onChange={(event) => setUloga(event.target.value as typeof uloga)} className="mt-1 w-full rounded-lg border border-stone-300 p-2">{ULOGE.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-sm">PIN (4–8 cifara)<input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} value={pin} onChange={(event) => setPin(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
        <div className="flex items-end gap-2">
          <button disabled={radi} className="min-h-10 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{uredjuje ? "Sačuvaj" : "Dodaj osobu"}</button>
          {uredjuje && <button type="button" onClick={() => { setUredjuje(null); setIme(""); setPin(""); }} className="text-sm underline">Odustani</button>}
        </div>
      </form>
      <p className="mt-2 text-xs text-stone-500">PIN se čuva kao hash i ne može se naknadno prikazati.</p>
      <ul className="mt-4 divide-y divide-stone-100">
        {zaposlenici.map((osoba) => (
          <li key={osoba.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className={osoba.aktivan ? "" : "text-stone-400"}>{osoba.ime} · {ULOGE.find(([id]) => id === osoba.uloga)?.[1] ?? osoba.uloga}{osoba.aktivan ? "" : " · deaktiviran"}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setUredjuje(osoba); setIme(osoba.ime); setUloga(osoba.uloga as typeof uloga); setPin(""); }} className="rounded border border-stone-300 px-3 py-1 text-sm">Izmijeni / novi PIN</button>
              <button type="button" disabled={radi} onClick={() => void postaviAktivnost(osoba)} className="rounded border border-stone-300 px-3 py-1 text-sm disabled:opacity-50">{osoba.aktivan ? "Deaktiviraj" : "Aktiviraj"}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
