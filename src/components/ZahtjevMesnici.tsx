"use client";

import { useEffect, useState } from "react";

type Artikal = { id: string; naziv: string; jedinica: string; stanje: number; minimum: number };

export function ZahtjevMesnici() {
  const [artikli, setArtikli] = useState<Artikal[]>([]);
  const [zalihaId, setZalihaId] = useState("");
  const [kolicina, setKolicina] = useState("");
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void fetch("/api/zaliha", { cache: "no-store" })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.greska ?? "Lista zaliha nije dostupna.");
          if (active) {
            setArtikli(result.zaliha);
            setZalihaId(result.zaliha[0]?.id ?? "");
          }
        })
        .catch((error: unknown) => {
          if (active) setGreska(error instanceof Error ? error.message : "Lista zaliha nije dostupna.");
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function posalji(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const response = await fetch("/api/zaliha/zahtjevi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zalihaId,
          kolicina: kolicina ? Number(kolicina) : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setGreska(result.greska ?? "Zahtjev nije poslan.");
        return;
      }
      setKolicina("");
      setPoruka("Zahtjev je poslan mesnici.");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  return (
    <details className="rounded-xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold">Zahtjev mesnici</summary>
      {greska && <p role="alert" className="mt-3 text-sm text-red-700">{greska}</p>}
      {poruka && <p role="status" className="mt-3 text-sm text-emerald-800">{poruka}</p>}
      <form onSubmit={(event) => void posalji(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <label className="text-sm">Artikal<select required value={zalihaId} onChange={(event) => setZalihaId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2"><option value="">Odaberite artikal</option>{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {artikal.stanje} {artikal.jedinica}</option>)}</select></label>
        <label className="text-sm">Količina (opcionalno)<input type="number" min="0.001" step="0.001" value={kolicina} onChange={(event) => setKolicina(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
        <button disabled={radi || !zalihaId} className="self-end rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white disabled:opacity-50">Pošalji</button>
      </form>
    </details>
  );
}
