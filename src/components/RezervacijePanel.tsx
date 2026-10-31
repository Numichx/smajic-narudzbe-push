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

function graniceDana(dan: string) {
  const [godina, mjesec, danUMjesecu] = dan.split("-").map(Number);
  return {
    od: new Date(godina, mjesec - 1, danUMjesecu).toISOString(),
    do: new Date(godina, mjesec - 1, danUMjesecu + 1).toISOString(),
  };
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
    if (!dan) return;
    try {
      const odgovor = await fetch(`/api/rezervacije?${new URLSearchParams(graniceDana(dan))}`, { cache: "no-store" });
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
    <main className="contents">
      <div className="contents">
        <p className="section-sub">Smajić · Konobar</p>
        <h1 className="page-title mt-1">Rezervacije</h1>
        {greska && <p role="alert" className="alert alert-danger mt-4">{greska}</p>}
        {poruka && <p role="status" className="alert alert-ok mt-4">{poruka}</p>}

        <form onSubmit={(event) => void kreiraj(event)} className="card card-pad mt-5 grid gap-3 sm:grid-cols-2">
          <h2 className="section-title sm:col-span-2">Nova rezervacija</h2>
          <label className="pole">Ime gosta<input required minLength={2} maxLength={100} value={ime} onChange={(event) => setIme(event.target.value)} className="input" /></label>
          <label className="pole">Broj gostiju<input required type="number" min={1} max={200} value={brojGostiju} onChange={(event) => setBrojGostiju(event.target.value)} className="input" /></label>
          <label className="pole">Datum i vrijeme<input required type="datetime-local" value={vrijeme} onChange={(event) => setVrijeme(event.target.value)} className="input" /></label>
          <label className="pole">Sto (neobavezno)<select value={stoId} onChange={(event) => setStoId(event.target.value)} className="input"><option value="">Bez odabranog stola</option>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={i + 1}>Sto {i + 1}</option>)}</select></label>
          <label className="pole">Telefon<input maxLength={40} value={telefon} onChange={(event) => setTelefon(event.target.value)} className="input" /></label>
          <label className="pole">Napomena<input maxLength={500} value={napomena} onChange={(event) => setNapomena(event.target.value)} className="input" /></label>
          <button disabled={radi} className="btn btn-primary sm:col-span-2">Sačuvaj rezervaciju</button>
        </form>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Pregled dana</h2>
            <input aria-label="Datum pregleda" type="date" value={dan} onChange={(event) => setDan(event.target.value)} className="input" />
          </div>
          {rezervacije.length === 0 ? <p className="card card-pad mt-3 small muted">Nema rezervacija za izabrani dan.</p> : (
            <ul className="mt-3 space-y-3">
              {rezervacije.map((stavka) => (
                <li key={stavka.id} className="card card-pad">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{new Date(stavka.rezervisano_za).toLocaleTimeString("bs-BA", { hour: "2-digit", minute: "2-digit" })} · {stavka.ime}</p>
                      <p className="small muted">{stavka.broj_gostiju} gostiju{stavka.sto_id ? ` · Sto ${stavka.sto_id}` : ""}{stavka.telefon ? ` · ${stavka.telefon}` : ""}</p>
                      {stavka.napomena && <p className="mt-1 text-sm">{stavka.napomena}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tiny muted">{stavka.status}</span>
                      {stavka.status === "aktivna" && <>
                        <button disabled={radi} onClick={() => void promijeniStatus(stavka.id, "realizovana")} className="btn btn-soft btn-sm">Realizovana</button>
                        <button disabled={radi} onClick={() => void promijeniStatus(stavka.id, "otkazana")} className="btn btn-warn btn-sm">Otkaži</button>
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
