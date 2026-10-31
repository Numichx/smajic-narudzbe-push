"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  izracunajPopisPecenjare,
  type PopisPecenjareResult,
} from "@/lib/domain/pecenjara";

type Smjena = {
  id: string;
  oznaka: "I" | "II";
  pocetak_at: string;
  preuzeo_ime: string;
};

type Popis = {
  smjena_id: string;
  pocetne_koke_pecene: number;
  pocetne_koke_sirove: number;
  pocetna_janjetina_kg: number;
  dodatne_koke: number;
  dodatna_janjetina_kg: number;
  preostale_koke: number | null;
  preostala_janjetina_kg: number | null;
  prodane_koke: number | null;
  prodana_janjetina_kg: number | null;
  pazar_po_popisu: number | null;
  predani_pazar: number | null;
  razlika: number | null;
  evidentirao_ime: string;
  kreirano_at: string;
  zatvoreno_at: string | null;
};

type UnosPopisa = {
  pocetneKokePecene: string;
  pocetneKokeSirove: string;
  pocetnaJanjetinaKg: string;
  dodatneKoke: string;
  dodatnaJanjetinaKg: string;
  preostaleKoke: string;
  preostalaJanjetinaKg: string;
  predaniPazar: string;
};

const pocetniUnos: UnosPopisa = {
  pocetneKokePecene: "0",
  pocetneKokeSirove: "0",
  pocetnaJanjetinaKg: "0",
  dodatneKoke: "0",
  dodatnaJanjetinaKg: "0",
  preostaleKoke: "0",
  preostalaJanjetinaKg: "0",
  predaniPazar: "0",
};

function broj(unos: string) {
  return unos.trim() === "" ? Number.NaN : Number(unos);
}

function prikaziIznos(iznos: number | null) {
  return `${Number(iznos ?? 0).toFixed(2)} KM`;
}

export function PopisPecenjare() {
  const [aktivnaSmjena, setAktivnaSmjena] = useState<Smjena | null>(null);
  const [popis, setPopis] = useState<Popis | null>(null);
  const [historija, setHistorija] = useState<Popis[]>([]);
  const [unos, setUnos] = useState<UnosPopisa>(pocetniUnos);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/pecenjara/smjena", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Popis pečenjare nije moguće učitati.");
        return;
      }
      setAktivnaSmjena(podaci.aktivnaSmjena);
      setPopis(podaci.popis);
      setHistorija(podaci.historija);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

  const pregled = useMemo((): { rezultat: PopisPecenjareResult | null; greska: string } => {
    if (!popis || popis.zatvoreno_at) return { rezultat: null, greska: "" };
    try {
      return {
        rezultat: izracunajPopisPecenjare({
          pocetneKokePecene: popis.pocetne_koke_pecene,
          pocetneKokeSirove: popis.pocetne_koke_sirove,
          dodatneKoke: broj(unos.dodatneKoke),
          preostaleKoke: broj(unos.preostaleKoke),
          pocetnaJanjetinaKg: Number(popis.pocetna_janjetina_kg),
          dodatnaJanjetinaKg: broj(unos.dodatnaJanjetinaKg),
          preostalaJanjetinaKg: broj(unos.preostalaJanjetinaKg),
          predaniPazar: broj(unos.predaniPazar),
        }),
        greska: "",
      };
    } catch (error) {
      return {
        rezultat: null,
        greska: error instanceof Error ? error.message : "Završni popis nije ispravan.",
      };
    }
  }, [popis, unos]);

  async function posalji(method: "POST" | "PATCH", body: object) {
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch("/api/pecenjara/smjena", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Popis pečenjare nije sačuvan.");
        return;
      }
      setPoruka(method === "POST" ? "Početni popis je sačuvan." : "Popis je zaključen.");
      setUnos(pocetniUnos);
      await ucitaj();
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setRadi(false);
    }
  }

  function promijeni(polje: keyof UnosPopisa, vrijednost: string) {
    setUnos((trenutni) => ({ ...trenutni, [polje]: vrijednost }));
  }

  function polje(
    label: string,
    name: keyof UnosPopisa,
    korak: "1" | "0.001" | "0.01",
  ) {
    return (
      <label className="pole" key={name}>
        {label}
        <input
          aria-label={label}
          type="number"
          min="0"
          step={korak}
          value={unos[name]}
          onChange={(event) => promijeni(name, event.target.value)}
          className="input"
        />
      </label>
    );
  }

  const aktivniPopis = Boolean(popis && !popis.zatvoreno_at);

  return (
    <section className="card card-pad">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Popis pečenjare po smjeni</h2>
        <button type="button" onClick={() => void ucitaj()} className="btn-link">
          Osvježi
        </button>
      </div>
      <p className="small muted mt-1">
        Pazar po popisu računa koke po 14 KM i janjetinu po 50 KM/kg.
      </p>
      {greska && <p role="alert" className="alert alert-danger mt-3">{greska}</p>}
      {poruka && <p role="status" className="alert alert-ok mt-3">{poruka}</p>}

      {aktivnaSmjena ? (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <p className="text-sm text-stone-700">
            Smjena {aktivnaSmjena.oznaka} · {aktivnaSmjena.preuzeo_ime} · od{" "}
            {new Date(aktivnaSmjena.pocetak_at).toLocaleString("bs-BA")}
          </p>
          {!popis ? (
            <fieldset className="mt-3">
              <legend className="text-sm font-semibold">Početno stanje</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {polje("Početno pečene koke (kom)", "pocetneKokePecene", "1")}
                {polje("Početno sirove koke (kom)", "pocetneKokeSirove", "1")}
                {polje("Početna janjetina (kg)", "pocetnaJanjetinaKg", "0.001")}
              </div>
              <button
                type="button"
                disabled={radi}
                onClick={() => void posalji("POST", {
                  smjenaId: aktivnaSmjena.id,
                  pocetneKokePecene: broj(unos.pocetneKokePecene),
                  pocetneKokeSirove: broj(unos.pocetneKokeSirove),
                  pocetnaJanjetinaKg: broj(unos.pocetnaJanjetinaKg),
                })}
                className="btn btn-primary mt-3"
              >
                Sačuvaj početni popis
              </button>
            </fieldset>
          ) : aktivniPopis ? (
            <div className="mt-3">
              <p className="small muted">
                Početno: {popis.pocetne_koke_pecene} pečenih + {popis.pocetne_koke_sirove} sirovih koka,
                {" "}{Number(popis.pocetna_janjetina_kg).toFixed(3)} kg janjetine.
              </p>
              <fieldset className="mt-3">
                <legend className="text-sm font-semibold">Završni popis</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {polje("Dodatne koke (kom)", "dodatneKoke", "1")}
                  {polje("Dodatna janjetina (kg)", "dodatnaJanjetinaKg", "0.001")}
                  {polje("Preostale koke (kom)", "preostaleKoke", "1")}
                  {polje("Preostala janjetina (kg)", "preostalaJanjetinaKg", "0.001")}
                  {polje("Predani pazar (KM)", "predaniPazar", "0.01")}
                </div>
              </fieldset>
              {pregled.greska ? (
                <p role="alert" className="alert alert-danger mt-3">{pregled.greska}</p>
              ) : pregled.rezultat && (
                <div className="panel mt-3 small">
                  <p>Prodane koke: <strong>{pregled.rezultat.prodaneKoke}</strong></p>
                  <p>Prodana janjetina: <strong>{pregled.rezultat.prodanaJanjetinaKg.toFixed(3)} kg</strong></p>
                  <p>Pazar po popisu: <strong>{prikaziIznos(pregled.rezultat.pazarPoPopisu)}</strong></p>
                  <p>Razlika: <strong>{prikaziIznos(pregled.rezultat.razlika)}</strong></p>
                </div>
              )}
              <button
                type="button"
                disabled={radi || !pregled.rezultat}
                onClick={() => void posalji("PATCH", {
                  smjenaId: aktivnaSmjena.id,
                  dodatneKoke: broj(unos.dodatneKoke),
                  dodatnaJanjetinaKg: broj(unos.dodatnaJanjetinaKg),
                  preostaleKoke: broj(unos.preostaleKoke),
                  preostalaJanjetinaKg: broj(unos.preostalaJanjetinaKg),
                  predaniPazar: broj(unos.predaniPazar),
                })}
                className="btn btn-primary mt-3"
              >
                Zaključi popis pečenjare
              </button>
            </div>
          ) : (
            <p className="alert alert-ok mt-3">Popis pečenjare za ovu smjenu je zaključen.</p>
          )}
        </div>
      ) : (
        <p className="small muted mt-4">
          Nema otvorene smjene. Prvo preuzmite smjenu u panelu šefice ili šanka.
        </p>
      )}

      {historija.length > 0 && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <h3 className="font-semibold">Zadnji popisi</h3>
          <ul className="mt-2 divide-y divide-stone-100">
            {historija.map((stavka) => (
              <li key={stavka.smjena_id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span>
                  {new Date(stavka.kreirano_at).toLocaleDateString("bs-BA")} · {stavka.evidentirao_ime}
                </span>
                {stavka.zatvoreno_at ? (
                  <span className="text-right">
                    <strong>{prikaziIznos(stavka.pazar_po_popisu)}</strong>
                    <span className="block text-xs text-stone-600">
                      {stavka.prodane_koke} koke · {Number(stavka.prodana_janjetina_kg ?? 0).toFixed(3)} kg ·
                      {" "}razlika {prikaziIznos(stavka.razlika)}
                    </span>
                  </span>
                ) : <span className="badge badge-open">Otvoren</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
