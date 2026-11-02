"use client";

import { useCallback, useEffect, useState } from "react";

type Artikal = { id: string; naziv: string; cijena: number; jedinica: string };
type Smjena = { id: string; oznaka: string; preuzeo_ime: string; pocetni_popis_sanka: Record<string, number> };

export function SankDopune() {
  const [artikli, setArtikli] = useState<Artikal[]>([]);
  const [smjena, setSmjena] = useState<Smjena | null>(null);
  const [proizvodId, setProizvodId] = useState("");
  const [kolicina, setKolicina] = useState("");
  const [greska, setGreska] = useState("");
  // Greška učitavanja je odvojena: osvježavanje ne smije brisati poruku o radnji.
  const [greskaUcitavanja, setGreskaUcitavanja] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/sank/artikli", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreskaUcitavanja(body.greska ?? "Podatke šanka nije moguće učitati.");
        return;
      }
      setArtikli(body.artikli);
      setSmjena(body.smjena);
      setProizvodId((current) => current || body.artikli[0]?.id || "");
      setGreskaUcitavanja("");
    } catch {
      setGreskaUcitavanja("Nema veze sa serverom.");
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

  async function evidentiraj(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/sank/dopune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proizvodId, kolicina: Number(kolicina) }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Dopunu nije moguće evidentirati.");
        return;
      }
      setPoruka("Dopuna je evidentirana u otvorenoj smjeni.");
      setKolicina("");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <section className="card card-pad">
      <h2 className="section-title">Popis i dopune šanka</h2>
      {smjena ? (
        <p className="small muted mt-1">Smjena {smjena.oznaka} · preuzeo/la {smjena.preuzeo_ime}</p>
      ) : (
        <p className="alert alert-warn mt-2">Nema otvorene smjene. Preuzmite smjenu da biste evidentirali dopune.</p>
      )}
      {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
      {greskaUcitavanja && <p role="alert" className="alert alert-danger mt-3">{greskaUcitavanja}</p>}
      {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}
      {smjena && (
        <form onSubmit={(event) => void evidentiraj(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <label className="pole">Artikal<select value={proizvodId} onChange={(event) => setProizvodId(event.target.value)} className="input">{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {Number(artikal.cijena).toFixed(2)} KM/{artikal.jedinica}</option>)}</select></label>
          <label className="pole">Dopunjeno<input required type="number" min="0.001" step="0.001" value={kolicina} onChange={(event) => setKolicina(event.target.value)} className="input" /></label>
          <button disabled={radi || !proizvodId} className="btn btn-primary self-end">Evidentiraj dopunu</button>
        </form>
      )}
    </section>
  );
}
