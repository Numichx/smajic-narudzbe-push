"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ikona } from "./Ikona";

type Stol = {
  id: number;
  naziv: string;
  racun: {
    ukupno: number;
    minute: number;
    cekaNaplatu: boolean;
  } | null;
};

type FilterStolova = "svi" | "zauzeti" | "slobodni" | "naplata";

const FILTERI: { id: FilterStolova; naziv: string; uslov: (sto: Stol) => boolean }[] = [
  { id: "svi", naziv: "Svi", uslov: () => true },
  { id: "zauzeti", naziv: "Zauzeti", uslov: (sto) => sto.racun !== null && !sto.racun.cekaNaplatu },
  { id: "slobodni", naziv: "Slobodni", uslov: (sto) => sto.racun === null },
  { id: "naplata", naziv: "Čeka naplatu", uslov: (sto) => Boolean(sto.racun?.cekaNaplatu) },
];

export function StoloviPregled() {
  const [stolovi, setStolovi] = useState<Stol[]>([]);
  const [filter, setFilter] = useState<FilterStolova>("svi");
  const [greska, setGreska] = useState("");
  const [ucitava, setUcitava] = useState(true);

  const ucitajStolove = useCallback(async () => {
    try {
      const odgovor = await fetch("/api/stolovi", { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Stolove nije moguće učitati.");
        return;
      }

      setStolovi(podaci.stolovi);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setUcitava(false);
    }
  }, []);

  useEffect(() => {
    const pocetnoUcitavanje = window.setTimeout(
      () => void ucitajStolove(),
      0,
    );
    const interval = window.setInterval(() => void ucitajStolove(), 5000);
    return () => {
      window.clearTimeout(pocetnoUcitavanje);
      window.clearInterval(interval);
    };
  }, [ucitajStolove]);

  const aktivniFilter = FILTERI.find((opcija) => opcija.id === filter) ?? FILTERI[0];
  const prikazaniStolovi = stolovi.filter(aktivniFilter.uslov);
  const zauzeto = stolovi.filter((sto) => sto.racun !== null).length;
  const cekaNaplatu = stolovi.filter((sto) => sto.racun?.cekaNaplatu).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stolovi</h1>
          <p>{stolovi.length} stolova · {zauzeto} zauzeto · {cekaNaplatu} čeka naplatu</p>
        </div>
        <button type="button" onClick={() => void ucitajStolove()} className="btn btn-ghost btn-sm">
          <Ikona naziv="osvjezi" /> Osvježi
        </button>
      </div>

      <div className="row-between mb-3 wrap">
        <div className="legend">
          <span><i style={{ background: "var(--peach-bg)" }} />Zauzet</span>
          <span><i style={{ background: "var(--mint-bg)" }} />Čeka naplatu</span>
          <span><i style={{ background: "var(--lav-bg)" }} />Slobodan</span>
        </div>
        <div className="pills" aria-label="Filter stolova">
          {FILTERI.map((opcija) => (
            <button
              key={opcija.id}
              type="button"
              onClick={() => setFilter(opcija.id)}
              aria-pressed={filter === opcija.id}
              className={`pill sm${filter === opcija.id ? " is-active" : ""}`}
            >
              {opcija.naziv} <span className="n">{stolovi.filter(opcija.uslov).length}</span>
            </button>
          ))}
        </div>
      </div>

      {greska && (
        <div role="alert" className="alert alert-danger mb-3"><Ikona naziv="upozorenje" /><div>{greska}</div></div>
      )}

      {ucitava ? (
        <p className="muted small">Učitavanje stolova...</p>
      ) : (
        <div className="tgrid">
          {prikazaniStolovi.map((sto) => {
            const stanje = sto.racun?.cekaNaplatu ? "is-pay" : sto.racun ? "is-busy" : "is-free";
            return (
              <Link key={sto.id} href={`/konobar/stolovi/${sto.id}`} className={`tcard ${stanje}`}>
                <span className="tno">{sto.naziv}</span>
                {sto.racun ? (
                  <span className="tmeta">
                    {sto.racun.ukupno.toFixed(2)} KM · {sto.racun.cekaNaplatu ? "čeka naplatu" : `${sto.racun.minute} min`}
                  </span>
                ) : (
                  <span className="tst">Slobodan</span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className="alert alert-info mt-4">
        <Ikona naziv="info" />
        <div>Račun se otvara pri prvom slanju narudžbe. Sto bez otvorenog računa je slobodan.</div>
      </div>
    </>
  );
}
