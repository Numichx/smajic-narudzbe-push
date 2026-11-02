"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Proizvod = { id: string; naziv: string; stanica: string };
type Sastojak = { zalihaId: string; kolicina: string };
type Recept = { id: string; proizvod_id: string; sastojci_recepta: { zaliha_id: string; kolicina: number }[] };
type ArtikalZalihe = { id: string; naziv: string; jedinica: string };

function sastojciRecepta(recepti: Recept[], proizvodId: string): Sastojak[] {
  return recepti.find((recept) => recept.proizvod_id === proizvodId)?.sastojci_recepta.map((stavka) => ({
    zalihaId: stavka.zaliha_id,
    kolicina: String(stavka.kolicina),
  })) ?? [];
}

export function ReceptiPanel() {
  const [proizvodi, setProizvodi] = useState<Proizvod[]>([]);
  const [artikli, setArtikli] = useState<ArtikalZalihe[]>([]);
  const [recepti, setRecepti] = useState<Recept[]>([]);
  const [proizvodId, setProizvodId] = useState("");
  const [sastojci, setSastojci] = useState<Sastojak[]>([]);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);
  const izabranPocetni = useRef(false);

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
      // Prvi proizvod se bira samo pri prvom učitavanju; kasnije osvježavanje ne dira
      // otvoreni recept, pa ispražnjen recept ne dobija sastojke drugog proizvoda.
      if (!izabranPocetni.current) {
        izabranPocetni.current = true;
        const prviProizvodId = body.proizvodi[0]?.id ?? "";
        setProizvodId(prviProizvodId);
        setSastojci(sastojciRecepta(body.recepti, prviProizvodId));
      }
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
    setSastojci(sastojciRecepta(recepti, id));
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
    <section className="card card-pad mt-6">
      <h2 className="section-title">Recepti i normativi</h2>
      <p className="small muted mt-1">Recepti služe za prijedlog nabavke i ne mijenjaju stanje robe. Količine su po jednoj porciji/artiklu.</p>
      {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
      {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}
      <form onSubmit={(event) => void sacuvaj(event)} className="mt-3">
        <label className="pole">Proizvod<select value={proizvodId} onChange={(event) => izaberiProizvod(event.target.value)} className="input">{proizvodi.map((proizvod) => <option key={proizvod.id} value={proizvod.id}>{proizvod.naziv} · {proizvod.stanica}</option>)}</select></label>
        <div className="mt-3 space-y-2">
          {sastojci.map((stavka, index) => (
            <div key={`${proizvodId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <select required value={stavka.zalihaId} onChange={(event) => azurirajSastojak(index, { zalihaId: event.target.value })} className="input"><option value="">Odaberite sastojak</option>{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} ({artikal.jedinica})</option>)}</select>
              <input required type="number" min="0.001" step="0.001" value={stavka.kolicina} onChange={(event) => azurirajSastojak(index, { kolicina: event.target.value })} aria-label="Količina po porciji" className="input" />
              <button type="button" onClick={() => setSastojci((prethodni) => prethodni.filter((_, i) => i !== index))} className="btn btn-ghost btn-sm">Ukloni</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setSastojci((prethodni) => [...prethodni, { zalihaId: "", kolicina: "0.1" }])} className="btn btn-ghost btn-sm">Dodaj sastojak</button>
          <button disabled={radi || !proizvodId} className="btn btn-primary">Sačuvaj recept</button>
        </div>
      </form>
    </section>
  );
}
