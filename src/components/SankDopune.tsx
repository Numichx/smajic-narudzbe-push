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
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/sank/artikli", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Podatke šanka nije moguće učitati.");
        return;
      }
      setArtikli(body.artikli);
      setSmjena(body.smjena);
      setProizvodId((current) => current || body.artikli[0]?.id || "");
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
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
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-bold">Popis i dopune šanka</h2>
      {smjena ? (
        <p className="mt-1 text-sm text-stone-600">Smjena {smjena.oznaka} · preuzeo/la {smjena.preuzeo_ime}</p>
      ) : (
        <p className="mt-1 text-sm text-amber-800">Nema otvorene smjene. Preuzmite smjenu da biste evidentirali dopune.</p>
      )}
      {greska && <p role="alert" className="mt-3 text-sm text-red-700">{greska}</p>}
      {poruka && <p role="status" className="mt-3 text-sm text-emerald-800">{poruka}</p>}
      {smjena && (
        <form onSubmit={(event) => void evidentiraj(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <label className="text-sm">Artikal<select value={proizvodId} onChange={(event) => setProizvodId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2">{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {Number(artikal.cijena).toFixed(2)} KM/{artikal.jedinica}</option>)}</select></label>
          <label className="text-sm">Dopunjeno<input required type="number" min="0.001" step="0.001" value={kolicina} onChange={(event) => setKolicina(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <button disabled={radi || !proizvodId} className="self-end rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Evidentiraj dopunu</button>
        </form>
      )}
    </section>
  );
}
