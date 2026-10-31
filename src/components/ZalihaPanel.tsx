"use client";

import { useCallback, useEffect, useState } from "react";

type Artikal = {
  id: string;
  naziv: string;
  jedinica: string;
  stanje: number;
  minimum: number;
  nabavna_cijena: number | null;
  prodajna_cijena: number | null;
};

type Zahtjev = {
  id: string;
  kolicina: number | null;
  izvor: string;
  status: string;
  kreirao_ime: string;
  kreirano_at: string;
  zaliha_artikli: { id: string; naziv: string; jedinica: string; stanje: number; minimum: number };
};
type Prijedlog = {
  id: string;
  naziv: string;
  jedinica: string;
  stanje: number;
  sedmodnevna_prodaja: number;
  predlozena_nabavka: number;
};

export function ZalihaPanel({ uloga }: { uloga: "sefica" | "mesnica" }) {
  const [artikli, setArtikli] = useState<Artikal[]>([]);
  const [zahtjevi, setZahtjevi] = useState<Zahtjev[]>([]);
  const [nabavka, setNabavka] = useState<Prijedlog[]>([]);
  const [izmjene, setIzmjene] = useState<Record<string, { minimum: string; cijena: string; prodajnaCijena: string }>>({});
  const [isporuke, setIsporuke] = useState<Record<string, string>>({});
  const [prodajaId, setProdajaId] = useState("");
  const [prodajaKolicina, setProdajaKolicina] = useState("");
  const [promjenaId, setPromjenaId] = useState("");
  const [promjenaKolicina, setPromjenaKolicina] = useState("");
  const [promjenaRazlog, setPromjenaRazlog] = useState("");
  const [novoStanje, setNovoStanje] = useState<Record<string, string>>({});
  const [razlogStanja, setRazlogStanja] = useState("Popis mesnice");
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");
  const [radi, setRadi] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const odgovori = await Promise.all([
        fetch("/api/zaliha", { cache: "no-store" }),
        fetch("/api/zaliha/zahtjevi", { cache: "no-store" }),
        ...(uloga === "sefica" ? [fetch("/api/zaliha/nabavka", { cache: "no-store" })] : []),
      ]);
      const tijela = await Promise.all(odgovori.map((response) => response.json()));
      const [odgovorZaliha, odgovorZahtjevi, odgovorNabavka] = odgovori;
      const [podaciZaliha, podaciZahtjevi, podaciNabavka] = tijela;
      if (!odgovorZaliha.ok) {
        setGreska(podaciZaliha.greska ?? "Zalihe nije moguće učitati.");
        return;
      }
      if (!odgovorZahtjevi.ok) {
        setGreska(podaciZahtjevi.greska ?? "Zahtjeve mesnice nije moguće učitati.");
        return;
      }
      setArtikli(podaciZaliha.zaliha);
      setZahtjevi(podaciZahtjevi.zahtjevi);
      if (uloga === "sefica") {
        if (!odgovorNabavka?.ok) {
          setGreska(podaciNabavka?.greska ?? "Prijedlog nabavke nije moguće učitati.");
          return;
        }
        setNabavka(podaciNabavka.nabavka);
      }
      setGreska("");
    } catch {
      setGreska("Nema veze sa serverom.");
    }
  }, [uloga]);

  useEffect(() => {
    const timer = window.setTimeout(() => void ucitaj(), 0);
    // Mesnica je stanica: novi zahtjevi kuhinje moraju se pojaviti bez ručnog osvježavanja.
    const interval = uloga === "mesnica"
      ? window.setInterval(() => void ucitaj(), 15_000)
      : undefined;
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [ucitaj, uloga]);

  async function posaljiAkciju(url: string, method: "POST" | "PATCH", body: unknown) {
    setRadi(true);
    setGreska("");
    setPoruka("");
    try {
      const odgovor = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const podaci = await odgovor.json();
      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Promjena nije uspjela.");
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

  async function sacuvajArtikal(artikal: Artikal) {
    const vrijednosti = izmjene[artikal.id] ?? {
      minimum: String(artikal.minimum),
      cijena: artikal.nabavna_cijena === null ? "" : String(artikal.nabavna_cijena),
      prodajnaCijena: artikal.prodajna_cijena === null ? "" : String(artikal.prodajna_cijena),
    };
    const body: {
      id: string;
      minimum?: number;
      nabavnaCijena?: number | null;
      prodajnaCijena?: number | null;
    } = { id: artikal.id };
    if (vrijednosti.minimum !== "") body.minimum = Number(vrijednosti.minimum);
    // Prazno polje cijene znači da cijena nije podešena (null).
    body.nabavnaCijena = vrijednosti.cijena === "" ? null : Number(vrijednosti.cijena);
    body.prodajnaCijena = vrijednosti.prodajnaCijena === "" ? null : Number(vrijednosti.prodajnaCijena);
    await posaljiAkciju("/api/zaliha", "PATCH", body);
  }

  const aktivniZahtjevi = zahtjevi.filter((zahtjev) => zahtjev.status === "nov");

  return (
    <main className="contents">
      <div className="contents">
        <p className="section-sub">Smajić · {uloga === "sefica" ? "Šefica" : "Mesnica"}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="page-title">{uloga === "sefica" ? "Zaliha i nabavka" : "Mesnica"}</h1>
          <button type="button" onClick={() => void ucitaj()} className="btn btn-ghost btn-sm">Osvježi</button>
        </div>
        {greska && <p role="alert" className="alert alert-danger mt-4">{greska}</p>}
        {poruka && <p role="status" className="alert alert-ok mt-4">{poruka}</p>}

        {uloga === "sefica" && (
          <section id="stanje" className="mt-5">
            <h2 className="section-title">Stanje robe</h2>
            <ul className="mt-3 space-y-3">
              {artikli.map((artikal) => {
                const vrijednosti = izmjene[artikal.id] ?? {
                  minimum: String(artikal.minimum),
                  cijena: artikal.nabavna_cijena === null ? "" : String(artikal.nabavna_cijena),
                  prodajnaCijena: artikal.prodajna_cijena === null ? "" : String(artikal.prodajna_cijena),
                };
                const ispodMinimuma = Number(artikal.stanje) <= Number(artikal.minimum);
                return (
                  <li key={artikal.id} className={`grid items-center gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_6rem_7rem_7rem_auto] ${ispodMinimuma ? "border-amber-400" : "border-stone-200"}`}>
                    <div><p className="font-semibold">{artikal.naziv}</p><p className="tiny muted">Stanje: {artikal.stanje} {artikal.jedinica}{ispodMinimuma ? " · Na minimumu" : ""}</p></div>
                    <label className="pole">Minimum<input type="number" min={0} step="0.001" value={vrijednosti.minimum} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, minimum: event.target.value } })} className="input" /></label>
                    <label className="pole">Nabavno/kg<input type="number" min={0} step="0.01" value={vrijednosti.cijena} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, cijena: event.target.value } })} className="input" /></label>
                    <label className="pole">Prodajno/kg<input type="number" min={0} step="0.01" value={vrijednosti.prodajnaCijena} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, prodajnaCijena: event.target.value } })} className="input" /></label>
                    <button disabled={radi} onClick={() => void sacuvajArtikal(artikal)} className="btn btn-primary btn-sm">Sačuvaj</button>
                  </li>
                );
              })}
            </ul>
              <form
              onSubmit={async (event) => {
                event.preventDefault();
                const ok = await posaljiAkciju("/api/zaliha/promet", "POST", {
                  zalihaId: promjenaId,
                  promjena: Number(promjenaKolicina),
                  razlog: promjenaRazlog,
                });
                if (ok) {
                  setPromjenaKolicina("");
                  setPromjenaRazlog("");
                }
              }}
              className="panel mt-5 grid gap-3 sm:grid-cols-[1fr_9rem_1fr_auto]"
            >
              <label className="pole">Popis, višak ili otpis<select required value={promjenaId} onChange={(event) => setPromjenaId(event.target.value)} className="input"><option value="">Odaberite artikal</option>{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {artikal.stanje} {artikal.jedinica}</option>)}</select></label>
              <label className="pole">Promjena (+/−)<input required type="number" step="0.001" value={promjenaKolicina} onChange={(event) => setPromjenaKolicina(event.target.value)} className="input" /></label>
              <label className="pole">Razlog<input required minLength={3} maxLength={200} value={promjenaRazlog} onChange={(event) => setPromjenaRazlog(event.target.value)} className="input" /></label>
              <button disabled={radi || !promjenaId} className="btn btn-primary self-end">Evidentiraj</button>
            </form>
          </section>
        )}

        {uloga === "mesnica" && (
          <>
          <section id="zahtjevi" className="card card-pad mt-5">
            <h2 className="section-title">Otvoreni zahtjevi ({aktivniZahtjevi.length})</h2>
            {aktivniZahtjevi.length === 0 ? <p className="small muted mt-3">Nema otvorenih zahtjeva.</p> : (
              <ul className="mt-3 space-y-3">
                {aktivniZahtjevi.map((zahtjev) => (
                  <li key={zahtjev.id} className="panel">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{zahtjev.zaliha_artikli.naziv}</strong>
                      <span className="small muted">{zahtjev.kolicina ?? "Količina nije određena"} {zahtjev.zaliha_artikli.jedinica} · stanje {zahtjev.zaliha_artikli.stanje} · zahtjev: {zahtjev.kreirao_ime}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input aria-label="Isporučena količina" type="number" min="0.001" step="0.001" placeholder={`Količina (${zahtjev.zaliha_artikli.jedinica})`} value={isporuke[zahtjev.id] ?? (zahtjev.kolicina ? String(zahtjev.kolicina) : "")} onChange={(event) => setIsporuke({ ...isporuke, [zahtjev.id]: event.target.value })} className="input min-w-40 flex-1" />
                      <button disabled={radi || (!isporuke[zahtjev.id] && !zahtjev.kolicina)} onClick={() => void zahtjevAction(zahtjev, "isporuci")} className="btn btn-primary btn-sm">Potvrdi isporuku</button>
                      <button disabled={radi} onClick={() => void posaljiAkciju("/api/zaliha/zahtjevi", "PATCH", { radnja: "nema_na_stanju", zahtjevId: zahtjev.id })} className="btn btn-warn btn-sm">Nema na stanju</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section id="stanje" className="card card-pad mt-4">
            <h2 className="section-title">Stanje robe</h2>
            <p className="small muted mt-1">Upišite stvarno stanje nakon popisa ili prijema robe i potvrdite. Promjena se bilježi s razlogom.</p>
            <label className="pole mt-3">Razlog promjene<input required minLength={3} maxLength={200} value={razlogStanja} onChange={(event) => setRazlogStanja(event.target.value)} className="input" /></label>
            <ul className="mt-3 divide-y divide-stone-100">
              {artikli.map((artikal) => {
                const ispodMinimuma = Number(artikal.stanje) <= Number(artikal.minimum);
                const upisano = novoStanje[artikal.id] ?? "";
                const delta = upisano === "" ? 0 : Math.round((Number(upisano) - Number(artikal.stanje)) * 1000) / 1000;
                return (
                  <li key={artikal.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span>
                      <span className="font-semibold">{artikal.naziv}</span>
                      <span className={`block text-sm ${ispodMinimuma ? "font-semibold text-red-700" : "text-stone-600"}`}>
                        Stanje: {artikal.stanje} {artikal.jedinica}{ispodMinimuma ? " · Na minimumu" : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <input
                        aria-label={`Novo stanje za ${artikal.naziv}`}
                        type="number" min="0" step="0.001"
                        placeholder={`Novo (${artikal.jedinica})`}
                        value={upisano}
                        onChange={(event) => setNovoStanje({ ...novoStanje, [artikal.id]: event.target.value })}
                        className="input w-32"
                      />
                      <button
                        type="button"
                        disabled={radi || upisano === "" || !Number.isFinite(delta) || delta === 0 || Number(upisano) < 0 || razlogStanja.trim().length < 3}
                        onClick={async () => {
                          const ok = await posaljiAkciju("/api/zaliha/promet", "POST", {
                            zalihaId: artikal.id,
                            promjena: delta,
                            razlog: razlogStanja.trim(),
                          });
                          if (ok) setNovoStanje((prethodno) => ({ ...prethodno, [artikal.id]: "" }));
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "Sačuvaj"}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <form
            id="prodaja"
            onSubmit={async (event) => {
              event.preventDefault();
              const ok = await posaljiAkciju("/api/zaliha/prodaja", "POST", {
                zalihaId: prodajaId,
                kolicina: Number(prodajaKolicina),
              });
              if (ok) setProdajaKolicina("");
            }}
            className="card card-pad mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]"
          >
            <label className="pole">Prodaja mesa po kg<select required value={prodajaId} onChange={(event) => setProdajaId(event.target.value)} className="input"><option value="">Odaberite meso</option>{artikli.filter((artikal) => artikal.jedinica === "kg").map((artikal) => artikal.prodajna_cijena === null
              ? <option key={artikal.id} value={artikal.id} disabled>{artikal.naziv} · nema prodajne cijene (postavlja šefica)</option>
              : <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {Number(artikal.prodajna_cijena).toFixed(2)} KM/kg · stanje {artikal.stanje} kg</option>)}</select></label>
            <label className="pole">Količina (kg)<input required type="number" min="0.001" step="0.001" value={prodajaKolicina} onChange={(event) => setProdajaKolicina(event.target.value)} className="input" /></label>
            <button disabled={radi || !prodajaId} className="btn btn-primary self-end">Evidentiraj prodaju</button>
          </form>
          </>
        )}

        {uloga === "sefica" && (
          <section className="card card-pad mt-6">
            <h2 className="section-title">Prijedlog nabavke (7 dana × 1,2)</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {nabavka.map((artikal) => <li key={artikal.id} className="list-row small"><span>{artikal.naziv} · prodano {Number(artikal.sedmodnevna_prodaja).toFixed(3)} {artikal.jedinica}</span><strong>Nabaviti {Number(artikal.predlozena_nabavka).toFixed(3)} {artikal.jedinica}</strong></li>)}
            </ul>
          </section>
        )}

        {uloga === "sefica" && (
          <section className="card card-pad mt-6">
            <h2 className="section-title">Zahtjevi mesnice</h2>
            <ul className="mt-3 space-y-2">
              {zahtjevi.slice(0, 30).map((zahtjev) => <li key={zahtjev.id} className="flex flex-wrap justify-between gap-2 border-t border-stone-100 py-2 text-sm"><span>{zahtjev.zaliha_artikli.naziv} · {zahtjev.kolicina ?? "?"} {zahtjev.zaliha_artikli.jedinica} · {zahtjev.kreirao_ime}</span><span>{zahtjev.status}</span></li>)}
            </ul>
          </section>
        )}
      </div>
    </main>
  );

  function zahtjevAction(item: Zahtjev, radnja: "isporuci") {
    const amount = Number(isporuke[item.id] || item.kolicina);
    if (!Number.isFinite(amount) || amount <= 0) {
      setGreska("Unesite ispravnu količinu isporuke.");
      return Promise.resolve(false);
    }
    return posaljiAkciju("/api/zaliha/zahtjevi", "PATCH", {
      radnja,
      zahtjevId: item.id,
      kolicina: amount,
    });
  }
}
