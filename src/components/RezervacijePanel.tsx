"use client";

import { useCallback, useEffect, useState } from "react";

type Rezervacija = {
  id: string;
  ime: string;
  broj_gostiju: number;
  rezervisano_za: string;
  sto_id: number | null;
  telefon: string | null;
  napomena: string | null;
  status: "aktivna" | "realizovana" | "otkazana";
};

function lokalniDatum(datum: Date) {
  const offset = datum.getTimezoneOffset() * 60_000;
  return new Date(datum.getTime() - offset).toISOString().slice(0, 10);
}

export function RezervacijePanel() {
  const [dan, setDan] = useState("");
  const [rezervacije, setRezervacije] = useState<Rezervacija[]>([]);
  const [ime, setIme] = useState("");
  const [brojGostiju, setBrojGostiju] = useState("2");
  const [vrijeme, setVrijeme] = useState("");
  const [stoId, setStoId] = useState("");
  const [telefon, setTelefon] = useState("");
  const [napomena, setNapomena] = useState("");
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDan(lokalniDatum(new Date())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch(`/api/rezervacije?dan=${encodeURIComponent(dan)}`, { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Rezervacije nije moguće učitati.");
        return;
      }
      setRezervacije(podaci.rezervacije);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, [dan]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  async function kreiraj(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const rezervisanoZa = new Date(vrijeme).toISOString();
      const odgovor = await fetch("/api/rezervacije", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ime,
          brojGostiju: Number(brojGostiju),
          rezervisanoZa,
          stoId: stoId ? Number(stoId) : null,
          telefon,
          napomena,
        }),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Rezervaciju nije moguće sačuvati.");
        return;
      }
      setIme("");
      setTelefon("");
      setNapomena("");
      setPoruka("Rezervacija je sačuvana.");
      if (lokalniDatum(new Date(vrijeme)) === dan) await ucitaj();
    } catch {
      setGreska("Unesite ispravno vrijeme rezervacije.");
    } finally {
      setRadi(false);
    }
  }

  async function promijeniStatus(id: string, status: "realizovana" | "otkazana") {
    setRadi(true);
    setGreska("");
    try {
      const odgovor = await fetch("/api/rezervacije", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Status rezervacije nije moguće promijeniti.");
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
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-amber-700">Smajić · Konobar</p>
        <h1 className="mt-1 text-2xl font-bold">Rezervacije</h1>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {poruka && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{poruka}</p>}

        <form onSubmit={(event) => void kreiraj(event)} className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Nova rezervacija</h2>
          <label className="text-sm">Ime gosta<input required minLength={2} maxLength={100} value={ime} onChange={(event) => setIme(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <label className="text-sm">Broj gostiju<input required type="number" min={1} max={200} value={brojGostiju} onChange={(event) => setBrojGostiju(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <label className="text-sm">Datum i vrijeme<input required type="datetime-local" value={vrijeme} onChange={(event) => setVrijeme(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <label className="text-sm">Sto (neobavezno)<select value={stoId} onChange={(event) => setStoId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2"><option value="">Bez odabranog stola</option>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>Sto {i + 1}</option>)}</select></label>
          <label className="text-sm">Telefon<input maxLength={40} value={telefon} onChange={(event) => setTelefon(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <label className="text-sm">Napomena<input maxLength={500} value={napomena} onChange={(event) => setNapomena(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <button disabled={radi} className="min-h-11 rounded-lg bg-amber-500 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2">Sačuvaj rezervaciju</button>
        </form>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pregled dana</h2>
            <input aria-label="Datum pregleda" type="date" value={dan} onChange={(event) => setDan(event.target.value)} className="rounded-lg border border-stone-300 bg-white p-2" />
          </div>
          {rezervacije.length === 0 ? <p className="mt-3 rounded-xl bg-white p-4 text-sm text-stone-600">Nema rezervacija za izabrani dan.</p> : (
            <ul className="mt-3 space-y-3">
              {rezervacije.map((stavka) => (
                <li key={stavka.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{new Date(stavka.rezervisano_za).toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })} · {stavka.ime}</p>
                      <p className="text-sm text-stone-600">{stavka.broj_gostiju} gostiju{stavka.sto_id ? ` · Sto ${stavka.sto_id}` : ""}{stavka.telefon ? ` · ${stavka.telefon}` : ""}</p>
                      {stavka.napomena && <p className="mt-1 text-sm">{stavka.napomena}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">{stavka.status}</span>
                      {stavka.status === "aktivna" && <>
                        <button disabled={radi} onClick={() => void promijeniStatus(stavka.id, "realizovana")} className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800 disabled:opacity-50">Realizovana</button>
                        <button disabled={radi} onClick={() => void promijeniStatus(stavka.id, "otkazana")} className="rounded bg-red-50 px-3 py-2 text-sm text-red-800 disabled:opacity-50">Otkaži</button>
                      </>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
