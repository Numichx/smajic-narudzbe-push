"use client";

import { useCallback, useEffect, useState } from "react";

type Dnevnik = {
  id: number;
  akter_ime: string;
  akter_uloga: string;
  radnja: string;
  entitet: string;
  entitet_id: string | null;
  detalji: Record<string, unknown>;
  kreirano_at: string;
};

const VRSTE_PIN = [
  ["osoblje", "Osoblje · stanice"],
  ["sefica", "Šefica"],
  ["poseban_prilog", "Poseban prilog"],
] as const;

export function AdministracijaPanel() {
  const [vrsta, setVrsta] = useState<(typeof VRSTE_PIN)[number][0]>("osoblje");
  const [pin, setPin] = useState("");
  const [dnevnik, setDnevnik] = useState<Dnevnik[]>([]);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitajDnevnik = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/administracija/dnevnik", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Dnevnik nije moguće učitati.");
        return;
      }
      setDnevnik(podaci.dnevnik);
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitajDnevnik(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitajDnevnik]);

  async function sacuvajPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch("/api/administracija/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vrsta, pin }),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "PIN nije moguće promijeniti.");
        return;
      }
      setPin("");
      setPoruka("PIN je promijenjen. Nova vrijednost se ne prikazuje niti čuva u dnevniku.");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <main className="contents">
      <div className="contents">
        <p className="section-sub">Smajić · Šefica</p>
        <h1 className="page-title mt-1">Administracija</h1>
        {greska && <p role="alert" className="alert alert-danger mt-4">{greska}</p>}
        {poruka && <p role="status" className="alert alert-ok mt-4">{poruka}</p>}

        <form onSubmit={(event) => void sacuvajPin(event)} className="card card-pad mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="pole">PIN za promjenu<select value={vrsta} onChange={(event) => setVrsta(event.target.value as typeof vrsta)} className="input">{VRSTE_PIN.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="pole">Novi PIN (4–8 cifara)<input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} autoComplete="new-password" value={pin} onChange={(event) => setPin(event.target.value)} className="input" /></label>
          <button disabled={radi} className="btn btn-primary self-end">Promijeni PIN</button>
        </form>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Dnevnik radnji</h2>
            <button type="button" onClick={() => void ucitajDnevnik()} className="btn btn-ghost btn-sm">Osvježi</button>
          </div>
          {dnevnik.length === 0 ? <p className="card card-pad mt-3 small muted">Dnevnik je prazan.</p> : (
            <ul className="mt-3 space-y-2">
              {dnevnik.map((stavka) => (
                <li key={stavka.id} className="card card-pad">
                  <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{stavka.radnja} · {stavka.entitet}</strong><time className="muted">{new Date(stavka.kreirano_at).toLocaleString("bs-BA")}</time></div>
                  <p className="mt-1 text-sm text-stone-700">{stavka.akter_ime} ({stavka.akter_uloga}){stavka.entitet_id ? ` · ${stavka.entitet_id}` : ""}</p>
                  {Object.keys(stavka.detalji ?? {}).length > 0 && <pre className="mt-2 overflow-auto rounded bg-stone-50 p-2 text-xs">{JSON.stringify(stavka.detalji, null, 2)}</pre>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
