"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatirajRacun58mm } from "@/lib/print/racun58mm";

type Stavka = {
  id: string;
  naziv: string;
  jedinica: string;
  kolicina: number;
  cijena: number;
  prilozi: { naziv: string; cijena: number; kolicina?: number; poseban?: boolean }[];
  napomena: string | null;
  stornirano: boolean;
  storno_razlog: string | null;
};

type Racun = {
  id: string;
  broj: number;
  ukupno: number;
  sveIzdato: boolean;
  stolovi: { id: number; naziv: string }[];
  narudzbe: {
    id: string;
    broj: string;
    status: string;
    stavke_narudzbe: Stavka[];
  }[];
};

const RAZLOZI = ["Pogrešan unos", "Gost odustao", "Greška kuhinje", "Drugo"] as const;

export function KontroleRacuna({ stoId }: { stoId: number }) {
  const [racun, setRacun] = useState<Racun | null>(null);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [ucitava, setUcitava] = useState(true);
  const [gostDao, setGostDao] = useState("");
  const [vraceniKusur, setVraceniKusur] = useState("");
  const [nacin, setNacin] = useState<"gotovina" | "kartica" | "kombinovano" | "dug">("gotovina");
  const [duznik, setDuznik] = useState("");
  const [podijeljenoNa, setPodijeljenoNa] = useState("");
  const [odabraniRazlog, setOdabraniRazlog] = useState<Record<string, string>>({});
  const [stoU, setStoU] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const odgovor = await fetch(`/api/racuni/sto/${stoId}`, { cache: "no-store" });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Račun nije moguće učitati.");
        return;
      }
      setRacun(podaci.racun);
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom pri učitavanju računa.");
    } finally {
      setUcitava(false);
    }
  }, [stoId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    const interval = window.setInterval(() => void ucitaj(), 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [ucitaj]);

  const stavke = useMemo(
    () => racun?.narudzbe.flatMap((narudzba) => narudzba.stavke_narudzbe) ?? [],
    [racun],
  );
  const kusurOcekivan = Math.max(0, Number(gostDao || 0) - (racun?.ukupno ?? 0));

  async function posalji(url: string, tijelo: unknown) {
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tijelo),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Operacija nije uspjela.");
        return false;
      }
      setPoruka("Promjena je sačuvana.");
      await ucitaj();
      return true;
    } catch {
      setGreska("Nema veze sa serverom.");
      return false;
    } finally {
      setRadi(false);
    }
  }

  async function naplati() {
    if (!racun) return;
    const dao = nacin === "dug" ? 0 : Number(gostDao);
    const kusur = nacin === "dug" ? 0 : Number(vraceniKusur || 0);
    if (nacin !== "dug" && (!Number.isFinite(dao) || dao < racun.ukupno)) {
      setGreska("Iznos koji je gost dao mora pokriti račun.");
      return;
    }
    if (nacin !== "dug" && kusur > dao - racun.ukupno) {
      setGreska("Vraćeni kusur ne može biti veći od mogućeg kusura.");
      return;
    }
    const uspjelo = await posalji(`/api/racuni/${racun.id}/naplata`, {
      gostDao: dao,
      vraceniKusur: kusur,
      nacin,
      gostDuznik: nacin === "dug" ? duznik : undefined,
      podijeljenoNa: podijeljenoNa ? Number(podijeljenoNa) : undefined,
    });
    if (uspjelo) {
      setRacun(null);
      setPoruka("Račun je naplaćen i zatvoren.");
    }
  }

  function stampajRacun() {
    if (!racun) return;
    const prozor = window.open("", "_blank", "width=360,height=640");
    if (!prozor) {
      setGreska("Preglednik je blokirao prozor za štampu. Dozvolite iskačuće prozore.");
      return;
    }
    const stavkeZaStampu = stavke
      .filter((stavka) => !stavka.napomena?.startsWith("Prilog uz ") && !stavka.stornirano)
      .map((stavka) => ({
        naziv: [
          stavka.naziv,
          ...stavka.prilozi.map((prilog) => `${prilog.naziv}${prilog.poseban ? " ★" : ""}`),
        ].join(" / "),
        kolicina: stavka.kolicina,
        ukupno: stavka.cijena * stavka.kolicina +
          stavka.prilozi.reduce((sum, prilog) => sum + prilog.cijena, 0),
      }));
    const tekst = formatirajRacun58mm({
      nazivRestorana: "Restoran Smajić",
      brojRacuna: String(racun.broj),
      stavke: stavkeZaStampu,
      ukupno: racun.ukupno,
    });
    prozor.document.title = `Račun ${racun.broj}`;
    const stil = prozor.document.createElement("style");
    stil.textContent = "@page { size: 58mm auto; margin: 2mm; } body { width: 54mm; font: 12px monospace; white-space: pre-wrap; }";
    const sadrzaj = prozor.document.createElement("pre");
    sadrzaj.textContent = tekst;
    prozor.document.head.append(stil);
    prozor.document.body.append(sadrzaj);
    prozor.focus();
    prozor.print();
  }

  if (ucitava) return <p className="text-sm text-stone-600">Učitavanje računa...</p>;
  if (!racun) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="font-bold">Otvoreni račun</h2>
        <p className="mt-2 text-sm text-stone-600">Na ovom stolu još nema računa.</p>
        {greska && <p role="alert" className="mt-2 text-sm text-red-700">{greska}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Račun #{racun.broj}</h2>
          <p className="text-sm text-stone-600">
            Stolovi: {racun.stolovi.map((sto) => sto.naziv).join(", ")}
          </p>
        </div>
        <button type="button" onClick={() => void ucitaj()} className="text-sm underline">
          Osvježi
        </button>
      </div>

      <ul className="mt-3 divide-y divide-stone-100">
        {racun.narudzbe.map((narudzba) => (
          <li key={narudzba.id} className="py-2">
            <p className="text-xs font-semibold text-stone-500">
              {narudzba.broj} · {narudzba.status}
            </p>
            {narudzba.stavke_narudzbe
              .filter((stavka) => !stavka.napomena?.startsWith("Prilog uz "))
              .map((stavka) => (
              <div key={stavka.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="flex-1">
                  <span className={stavka.stornirano ? "text-stone-400 line-through" : ""}>
                    {stavka.naziv} · {stavka.kolicina}{stavka.jedinica === "kg" ? " kg" : ""}
                    {stavka.stornirano && ` · Storno: ${stavka.storno_razlog}`}
                  </span>
                  {stavka.prilozi.map((prilog, index) => (
                    <span key={`${stavka.id}-${index}`} className="block text-xs text-stone-500">
                      ↳ {prilog.naziv}{prilog.poseban ? " ★" : ""}{prilog.cijena > 0 ? ` · ${prilog.cijena.toFixed(2)} KM` : " · uključeno"}
                    </span>
                  ))}
                </span>
                {!stavka.stornirano && (
                  <div className="flex items-center gap-2">
                    <span>{(stavka.cijena * stavka.kolicina).toFixed(2)} KM</span>
                    <select
                      aria-label={`Razlog storna za ${stavka.naziv}`}
                      value={odabraniRazlog[stavka.id] ?? RAZLOZI[0]}
                      onChange={(event) => setOdabraniRazlog({ ...odabraniRazlog, [stavka.id]: event.target.value })}
                      className="max-w-36 rounded border border-stone-300 px-1 py-1 text-xs"
                    >
                      {RAZLOZI.map((razlog) => <option key={razlog}>{razlog}</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={radi}
                      onClick={() => void posalji(`/api/narudzbe/stavka/${stavka.id}/storno`, {
                        razlog: odabraniRazlog[stavka.id] ?? RAZLOZI[0],
                      })}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-800 disabled:opacity-50"
                    >
                      Storno
                    </button>
                  </div>
                )}
              </div>
            ))}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-bold">
        <span>Ukupno</span><span>{racun.ukupno.toFixed(2)} KM</span>
      </div>
      <button type="button" onClick={stampajRacun} className="mt-3 w-full rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">
        Štampaj račun · 58 mm
      </button>
      {greska && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{greska}</p>}
      {poruka && <p role="status" className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">{poruka}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Način naplate
          <select value={nacin} onChange={(event) => setNacin(event.target.value as typeof nacin)} className="mt-1 w-full rounded-lg border border-stone-300 p-2">
            <option value="gotovina">Gotovina</option>
            <option value="kartica">Kartica</option>
            <option value="kombinovano">Kombinovano</option>
            <option value="dug">Na dug</option>
          </select>
        </label>
        {nacin === "dug" ? (
          <label className="text-sm">Ime dužnika<input value={duznik} onChange={(event) => setDuznik(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
        ) : (
          <>
            <label className="text-sm">Gost dao (KM)<input type="number" min={0} step="0.01" value={gostDao} onChange={(event) => setGostDao(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
            <label className="text-sm">Kusur (najviše {kusurOcekivan.toFixed(2)} KM)<input type="number" min={0} step="0.01" value={vraceniKusur} onChange={(event) => setVraceniKusur(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
          </>
        )}
        <label className="text-sm">Broj osoba (neobavezno)<input type="number" min={1} max={100} value={podijeljenoNa} onChange={(event) => setPodijeljenoNa(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
      </div>
      {podijeljenoNa && Number(podijeljenoNa) > 0 && (
        <p className="mt-2 text-sm text-stone-600">
          Po osobi: {(racun.ukupno / Number(podijeljenoNa)).toFixed(2)} KM
        </p>
      )}
      {!racun.sveIzdato && <p className="mt-2 text-sm text-amber-800">Naplata je dostupna kada sve stanice izdaju narudžbe.</p>}
      <button type="button" disabled={radi || !racun.sveIzdato} onClick={() => void naplati()} className="mt-3 min-h-11 w-full rounded-lg bg-emerald-700 px-4 font-semibold text-white disabled:opacity-40">
        Naplati {racun.ukupno.toFixed(2)} KM
      </button>

      <div className="mt-5 border-t border-stone-200 pt-4">
        <h3 className="font-semibold">Premjesti, spoji ili podijeli sto</h3>
        <div className="mt-2 flex gap-2">
          <select value={stoU} onChange={(event) => setStoU(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-stone-300 p-2">
            <option value="">Odaberi ciljni sto</option>
            {Array.from({ length: 20 }, (_, index) => index + 1)
              .filter((id) => !racun.stolovi.some((sto) => sto.id === id))
              .map((id) => <option key={id} value={id}>Sto {id}</option>)}
          </select>
          <button
            type="button"
            disabled={!stoU || radi}
            onClick={async () => {
              const ok = await posalji("/api/stolovi/transfer", { stoIz: stoId, stoU: Number(stoU) });
              if (ok) setStoU("");
            }}
            className="rounded-lg border border-stone-300 px-3 text-sm font-medium disabled:opacity-40"
          >
            Premjesti / spoji
          </button>
        </div>
        <button
          type="button"
          disabled={!stoU || radi}
          onClick={async () => {
            const ok = await posalji("/api/stolovi/transfer", {
              stoIz: stoId,
              stoU: Number(stoU),
              podijeliRacunId: racun.id,
            });
            if (ok) setStoU("");
          }}
          className="mt-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium disabled:opacity-40"
        >
          Dodaj sto na isti račun
        </button>
        <p className="mt-1 text-xs text-stone-500">Ako je ciljni sto zauzet, prvi gumb spaja račune. Drugi dodaje sto ovom računu bez spajanja.</p>
      </div>
      <p className="sr-only">{stavke.length} stavki na računu</p>
    </section>
  );
}
