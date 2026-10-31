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
    <section className="card card-pad mt-6">
      <h2 className="section-title">Osoblje</h2>
      {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
      {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}
      <form onSubmit={(event) => void sacuvaj(event)} className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="pole">Ime<input required minLength={2} maxLength={80} value={ime} onChange={(event) => setIme(event.target.value)} className="input" /></label>
        <label className="pole">Uloga<select value={uloga} onChange={(event) => setUloga(event.target.value as typeof uloga)} className="input">{ULOGE.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="pole">PIN (4–8 cifara)<input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} value={pin} onChange={(event) => setPin(event.target.value)} className="input" /></label>
        <div className="flex items-end gap-2">
          <button disabled={radi} className="btn btn-primary">{uredjuje ? "Sačuvaj" : "Dodaj osobu"}</button>
          {uredjuje && <button type="button" onClick={() => { setUredjuje(null); setIme(""); setPin(""); }} className="btn-link">Odustani</button>}
        </div>
      </form>
      <p className="tiny muted mt-2">PIN se čuva kao hash i ne može se naknadno prikazati.</p>
      <ul className="mt-4 divide-y divide-stone-100">
        {zaposlenici.map((osoba) => (
          <li key={osoba.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span className={osoba.aktivan ? "" : "text-stone-400"}>{osoba.ime} · {ULOGE.find(([id]) => id === osoba.uloga)?.[1] ?? osoba.uloga}{osoba.aktivan ? "" : " · deaktiviran"}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setUredjuje(osoba); setIme(osoba.ime); setUloga(osoba.uloga as typeof uloga); setPin(""); }} className="btn btn-ghost btn-sm">Izmijeni / novi PIN</button>
              <button type="button" disabled={radi} onClick={() => void postaviAktivnost(osoba)} className="btn btn-ghost btn-sm">{osoba.aktivan ? "Deaktiviraj" : "Aktiviraj"}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
