"use client";

import { useCallback, useEffect, useState } from "react";

type Proizvod = { id: string; naziv: string; stanica: string };
type Sastojak = { zalihaId: string; kolicina: string };
type Recept = { id: string; proizvod_id: string; sastojci_recepta: { zaliha_id: string; kolicina: number }[] };
type ArtikalZalihe = { id: string; naziv: string; jedinica: string };

export function ReceptiPanel() {
  const [proizvodi, setProizvodi] = useState<Proizvod[]>([]);
  const [artikli, setArtikli] = useState<ArtikalZalihe[]>([]);
  const [recepti, setRecepti] = useState<Recept[]>([]);
  const [proizvodId, setProizvodId] = useState("");
  const [sastojci, setSastojci] = useState<Sastojak[]>([]);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const response = await fetch("/api/zaliha/recepti", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Recepte nije moguće učitati.");
        return;
      }
      setProizvodi(body.proizvodi);
      setArtikli(body.zaliha);
      setRecepti(body.recepti);
      const firstProductId = body.proizvodi[0]?.id ?? "";
      setProizvodId((current) => current || firstProductId);
      setSastojci((current) => current.length ? current : (
        body.recepti.find((recept: Recept) => recept.proizvod_id === firstProductId)
          ?.sastojci_recepta.map((item: Recept["sastojci_recepta"][number]) => ({
            zalihaId: item.zaliha_id,
            kolicina: String(item.kolicina),
          })) ?? []
      ));
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  function izaberiProizvod(id: string) {
    setProizvodId(id);
    const recept = recepti.find((stavka) => stavka.proizvod_id === id);
    setSastojci(recept?.sastojci_recepta.map((stavka) => ({
      zalihaId: stavka.zaliha_id,
      kolicina: String(stavka.kolicina),
    })) ?? []);
  }
  function azurirajSastojak(index: number, patch: Partial<Sastojak>) {
    setSastojci((prethodni) => prethodni.map((sastojak, i) => i === index ? { ...sastojak, ...patch } : sastojak));
  }

  async function sacuvaj(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/zaliha/recepti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proizvodId,
          sastojci: sastojci.map((stavka) => ({ zalihaId: stavka.zalihaId, kolicina: Number(stavka.kolicina) })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setGreska(body.greska ?? "Recept nije moguće sačuvati.");
        return;
      }
      setPoruka("Recept je sačuvan.");
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-bold">Recepti i normativi</h2>
      <p className="mt-1 text-sm text-stone-600">Potrošnja sastojaka se skida automatski pri slanju narudžbe. Količine su po jednoj porciji/artiklu.</p>
      {greska && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{greska}</p>}
      {poruka && <p role="status" className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{poruka}</p>}
      <form onSubmit={(event) => void sacuvaj(event)} className="mt-3">
        <label className="block text-sm">Proizvod<select value={proizvodId} onChange={(event) => izaberiProizvod(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2">{proizvodi.map((proizvod) => <option key={proizvod.id} value={proizvod.id}>{proizvod.naziv} · {proizvod.stanica}</option>)}</select></label>
        <div className="mt-3 space-y-2">
          {sastojci.map((stavka, index) => (
            <div key={`${proizvodId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <select required value={stavka.zalihaId} onChange={(event) => azurirajSastojak(index, { zalihaId: event.target.value })} className="rounded-lg border border-stone-300 p-2"><option value="">Odaberite sastojak</option>{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} ({artikal.jedinica})</option>)}</select>
              <input required type="number" min="0.001" step="0.001" value={stavka.kolicina} onChange={(event) => azurirajSastojak(index, { kolicina: event.target.value })} aria-label="Količina po porciji" className="rounded-lg border border-stone-300 p-2" />
              <button type="button" onClick={() => setSastojci((prethodni) => prethodni.filter((_, i) => i !== index))} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Ukloni</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSastojci((prethodni) => [...prethodni, { zalihaId: "", kolicina: "0.1" }])} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Dodaj sastojak</button>
          <button disabled={radi || !proizvodId} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Sačuvaj recept</button>
        </div>
      </form>
    </section>
  );
}
