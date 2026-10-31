"use client";

import { useCallback, useEffect, useState } from "react";

type Smjena = {
  id: string;
  oznaka: "I" | "II";
  pocetak_at: string;
  preuzeo_ime: string;
  status: "otvorena" | "zatvorena";
  pocetni_popis_sanka: Record<string, number>;
  zavrsni_popis_sanka: Record<string, number> | null;
  predani_pazar: number | null;
  zatvorio_ime: string | null;
  bar_pazar: number | null;
  kuhinja_pecenjara_pazar: number | null;
  ocekivani_pazar: number | null;
  razlika_pazara: number | null;
  popis_pecenjare_zatvoren: boolean;
};

type ArtikalSanka = { id: string; naziv: string; cijena: number; jedinica: string };

function pretvoriPopis(popis: Record<string, string>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(popis).map(([naziv, vrijednost]) => {
      const kolicina = Number(vrijednost);
      if (!Number.isFinite(kolicina) || kolicina < 0) {
        throw new Error(`Unesite ispravnu završnu količinu za ${naziv}.`);
      }
      return [naziv, kolicina];
    }),
  );
}

export function SmjenePanel({ naslov = "Smjena i zatvaranje dana", zatvaranjeDana = true }: { naslov?: string; zatvaranjeDana?: boolean }) {
  const [smjene, setSmjene] = useState<Smjena[]>([]);
  const [artikliSanka, setArtikliSanka] = useState<ArtikalSanka[]>([]);
  const [oznaka, setOznaka] = useState<"I" | "II">("I");
  const [pocetniPopis, setPocetniPopis] = useState<Record<string, string>>({});
  const [zavrsniPopis, setZavrsniPopis] = useState<Record<string, string>>({});
  const [predaniPazar, setPredaniPazar] = useState("");
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/smjene", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Smjene nije moguće učitati.");
        return;
      }
      setSmjene(podaci.smjene);
      const odgovorArtikala = await fetch("/api/sank/artikli", { cache: "no-store" });
      const podaciArtikala = await odgovorArtikala.json();
      if (!odgovorArtikala.ok) {
        setGreska(podaciArtikala.greska ?? "Artikle šanka nije moguće učitati.");
        return;
      }
      setArtikliSanka(podaciArtikala.artikli);
      setPocetniPopis((trenutni) => {
        const sljedeci = { ...trenutni };
        for (const artikal of podaciArtikala.artikli as ArtikalSanka[]) sljedeci[artikal.naziv] ??= "0";
        return sljedeci;
      });
      setZavrsniPopis((trenutni) => {
        const sljedeci = { ...trenutni };
        for (const artikal of podaciArtikala.artikli as ArtikalSanka[]) sljedeci[artikal.naziv] ??= "0";
        return sljedeci;
      });
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  const otvorena = smjene.find((smjena) => smjena.status === "otvorena");

  async function posalji(url: string, method: "POST" | "PATCH", body?: unknown) {
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Operacija nije uspjela.");
        return false;
      }
      const izvjestaj = podaci.izvjestaj;
      if (method === "PATCH" && izvjestaj) {
        setPoruka(
          `Šank ${Number(izvjestaj.bar_pazar).toFixed(2)} KM · kuhinja i pečenjara ${Number(izvjestaj.kuhinja_pecenjara_pazar).toFixed(2)} KM · očekivano ${Number(izvjestaj.ocekivani_pazar).toFixed(2)} KM · razlika ${Number(izvjestaj.razlika).toFixed(2)} KM.`,
        );
      } else {
        setPoruka("Promjena je sačuvana.");
      }
      await ucitaj();
      return true;
    } catch {
      setGreska("Nema veze sa serverom.");
      return false;
    } finally {
      setRadi(false);
    }
  }

  async function otvori() {
    try {
      await posalji("/api/smjene", "POST", { oznaka, popisSanka: pretvoriPopis(pocetniPopis) });
    } catch (error) {
      setGreska(error instanceof Error ? error.message : "Popis šanka nije ispravan.");
    }
  }

  async function zatvori() {
    if (!otvorena) return;
    try {
      await posalji("/api/smjene", "PATCH", {
        id: otvorena.id,
        popisSanka: pretvoriPopis(zavrsniPopis),
        predaniPazar: Number(predaniPazar),
      });
    } catch (error) {
      setGreska(error instanceof Error ? error.message : "Popis šanka nije ispravan.");
    }
  }

  async function zatvoriDan() {
    if (!window.confirm("Zatvoriti poslovni dan? Provjerite da nema otvorenih računa.")) return;
    await posalji("/api/smjene/zatvori-dan", "POST");
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{naslov}</h2>
        <button type="button" onClick={() => void ucitaj()} className="text-sm underline">Osvježi</button>
      </div>
      {greska && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{greska}</p>}
      {poruka && <p role="status" className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{poruka}</p>}

      {otvorena ? (
        <div className="mt-4">
          <p className="text-sm text-stone-700">Smjena {otvorena.oznaka} · preuzeo/la {otvorena.preuzeo_ime} · od {new Date(otvorena.pocetak_at).toLocaleString("bs-BA")}</p>
          <p className="mt-1 text-xs text-stone-500">Popis unesite po artiklu. Dopune evidentirane tokom smjene automatski se uračunavaju.</p>
          {!otvorena.popis_pecenjare_zatvoren && <p className="mt-2 text-sm text-amber-800">Prije zatvaranja smjene, pečenjara mora unijeti i zaključiti popis.</p>}
          <fieldset className="mt-3">
            <legend className="text-sm font-medium">Završni popis šanka</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {artikliSanka.map((artikal) => <label key={artikal.id} className="flex items-center justify-between gap-3 text-sm">{artikal.naziv}<span className="flex items-center gap-2"><input aria-label={`Završno stanje: ${artikal.naziv}`} type="number" min="0" step="0.001" value={zavrsniPopis[artikal.naziv] ?? "0"} onChange={(event) => setZavrsniPopis((stanje) => ({ ...stanje, [artikal.naziv]: event.target.value }))} className="w-28 rounded-lg border border-stone-300 p-2" /><span className="text-stone-500">{artikal.jedinica}</span></span></label>)}
            </div>
          </fieldset>
          <label className="mt-3 block text-sm">Predani pazar (KM)<input type="number" min={0} step="0.01" value={predaniPazar} onChange={(event) => setPredaniPazar(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          <button type="button" disabled={radi || predaniPazar === "" || !otvorena.popis_pecenjare_zatvoren} onClick={() => void zatvori()} className="mt-3 min-h-11 rounded-lg bg-stone-900 px-4 font-semibold text-white disabled:opacity-40">Zaključi smjenu</button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-stone-600">Trenutno nema otvorene smjene.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Smjena<select value={oznaka} onChange={(event) => setOznaka(event.target.value as "I" | "II")} className="mt-1 w-full rounded-lg border border-stone-300 p-2"><option value="I">I · 06–14</option><option value="II">II · 14–23</option></select></label>
          </div>
          <fieldset className="mt-3">
            <legend className="text-sm font-medium">Početni popis šanka</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {artikliSanka.map((artikal) => <label key={artikal.id} className="flex items-center justify-between gap-3 text-sm">{artikal.naziv}<span className="flex items-center gap-2"><input aria-label={`Početno stanje: ${artikal.naziv}`} type="number" min="0" step="0.001" value={pocetniPopis[artikal.naziv] ?? "0"} onChange={(event) => setPocetniPopis((stanje) => ({ ...stanje, [artikal.naziv]: event.target.value }))} className="w-28 rounded-lg border border-stone-300 p-2" /><span className="text-stone-500">{artikal.jedinica}</span></span></label>)}
            </div>
          </fieldset>
          <button type="button" disabled={radi} onClick={() => void otvori()} className="mt-3 min-h-11 rounded-lg bg-amber-500 px-4 font-semibold text-white disabled:opacity-40">Preuzmi smjenu</button>
        </div>
      )}
      {zatvaranjeDana && <div className="mt-4 border-t border-stone-200 pt-4">
        <button type="button" disabled={radi || Boolean(otvorena)} onClick={() => void zatvoriDan()} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-40">Zatvori dan</button>
      </div>}
      <ul className="mt-4 divide-y divide-stone-100">
        {smjene.filter((smjena) => smjena.status === "zatvorena").slice(0, 5).map((smjena) => (
          <li key={smjena.id} className="flex justify-between gap-2 py-2 text-sm"><span>{smjena.oznaka} smjena · {new Date(smjena.pocetak_at).toLocaleDateString("bs-BA")} · {smjena.preuzeo_ime}</span><span className="text-right"><strong>{Number(smjena.predani_pazar ?? 0).toFixed(2)} KM</strong>{smjena.razlika_pazara !== null && <span className="block text-xs text-stone-600">razlika {Number(smjena.razlika_pazara).toFixed(2)} KM</span>}</span></li>
        ))}
      </ul>
    </section>
  );
}
