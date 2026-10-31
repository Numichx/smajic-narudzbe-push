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
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-amber-700">Smajić · Šefica</p>
        <h1 className="mt-1 text-2xl font-bold">Administracija</h1>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {poruka && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{poruka}</p>}

        <form onSubmit={(event) => void sacuvajPin(event)} className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">PIN za promjenu<select value={vrsta} onChange={(event) => setVrsta(event.target.value as typeof vrsta)} className="mt-1 w-full rounded-lg border border-stone-300 p-2">{VRSTE_PIN.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="text-sm">Novi PIN (4–8 cifara)<input required type="password" inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} autoComplete="new-password" value={pin} onChange={(event) => setPin(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <button disabled={radi} className="self-end rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Promijeni PIN</button>
        </form>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Dnevnik radnji</h2>
            <button type="button" onClick={() => void ucitajDnevnik()} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Osvježi</button>
          </div>
          {dnevnik.length === 0 ? <p className="mt-3 rounded-xl bg-white p-4 text-sm text-stone-600">Dnevnik je prazan.</p> : (
            <ul className="mt-3 space-y-2">
              {dnevnik.map((stavka) => (
                <li key={stavka.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{stavka.radnja} · {stavka.entitet}</strong><time className="text-stone-500">{new Date(stavka.kreirano_at).toLocaleString("bs-BA")}</time></div>
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
