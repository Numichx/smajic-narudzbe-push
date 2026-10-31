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
    return () => window.clearTimeout(timer);
  }, [ucitaj]);

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
    if (vrijednosti.cijena !== "") body.nabavnaCijena = Number(vrijednosti.cijena);
    if (vrijednosti.prodajnaCijena !== "") body.prodajnaCijena = Number(vrijednosti.prodajnaCijena);
    await posaljiAkciju("/api/zaliha", "PATCH", body);
  }

  const aktivniZahtjevi = zahtjevi.filter((zahtjev) => zahtjev.status === "nov");

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-amber-700">Smajić · {uloga === "sefica" ? "Šefica" : "Mesnica"}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{uloga === "sefica" ? "Zaliha i nabavka" : "Zahtjevi mesnice"}</h1>
          <button type="button" onClick={() => void ucitaj()} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Osvježi</button>
        </div>
        {greska && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{greska}</p>}
        {poruka && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{poruka}</p>}

        {uloga === "sefica" && (
          <section id="stanje" className="mt-5">
            <h2 className="font-bold">Stanje robe</h2>
            <ul className="mt-3 space-y-3">
              {artikli.map((artikal) => {
                const vrijednosti = izmjene[artikal.id] ?? {
                  minimum: String(artikal.minimum),
                  cijena: artikal.nabavna_cijena === null ? "" : String(artikal.nabavna_cijena),
                  prodajnaCijena: artikal.prodajna_cijena === null ? "" : String(artikal.prodajna_cijena),
                };
                const ispodMinimuma = artikal.stanje <= artikal.minimum;
                return (
                  <li key={artikal.id} className={`grid items-center gap-3 rounded-xl border bg-white p-3 sm:grid-cols-[1fr_6rem_7rem_7rem_auto] ${ispodMinimuma ? "border-amber-400" : "border-stone-200"}`}>
                    <div><p className="font-semibold">{artikal.naziv}</p><p className="text-xs text-stone-500">Stanje: {artikal.stanje} {artikal.jedinica}{ispodMinimuma ? " · Na minimumu" : ""}</p></div>
                    <label className="text-xs">Minimum<input type="number" min={0} step="0.001" value={vrijednosti.minimum} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, minimum: event.target.value } })} className="mt-1 w-full rounded border border-stone-300 p-2 text-sm" /></label>
                    <label className="text-xs">Nabavno/kg<input type="number" min={0} step="0.01" value={vrijednosti.cijena} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, cijena: event.target.value } })} className="mt-1 w-full rounded border border-stone-300 p-2 text-sm" /></label>
                    <label className="text-xs">Prodajno/kg<input type="number" min={0} step="0.01" value={vrijednosti.prodajnaCijena} onChange={(event) => setIzmjene({ ...izmjene, [artikal.id]: { ...vrijednosti, prodajnaCijena: event.target.value } })} className="mt-1 w-full rounded border border-stone-300 p-2 text-sm" /></label>
                    <button disabled={radi} onClick={() => void sacuvajArtikal(artikal)} className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white disabled:opacity-50">Sačuvaj</button>
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
              className="mt-5 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1fr_9rem_1fr_auto]"
            >
              <label className="text-sm">Popis, višak ili otpis<select required value={promjenaId} onChange={(event) => setPromjenaId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2"><option value="">Odaberite artikal</option>{artikli.map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {artikal.stanje} {artikal.jedinica}</option>)}</select></label>
              <label className="text-sm">Promjena (+/−)<input required type="number" step="0.001" value={promjenaKolicina} onChange={(event) => setPromjenaKolicina(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2" /></label>
              <label className="text-sm">Razlog<input required minLength={3} maxLength={200} value={promjenaRazlog} onChange={(event) => setPromjenaRazlog(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-2" /></label>
              <button disabled={radi || !promjenaId} className="self-end rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Evidentiraj</button>
            </form>
          </section>
        )}

        {uloga === "mesnica" && (
          <>
          <section id="zahtjevi" className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold">Otvoreni zahtjevi ({aktivniZahtjevi.length})</h2>
            {aktivniZahtjevi.length === 0 ? <p className="mt-3 text-sm text-stone-600">Nema otvorenih zahtjeva.</p> : (
              <ul className="mt-3 space-y-3">
                {aktivniZahtjevi.map((zahtjev) => (
                  <li key={zahtjev.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{zahtjev.zaliha_artikli.naziv}</strong>
                      <span className="text-sm text-stone-600">{zahtjev.kolicina ?? "Količina nije određena"} {zahtjev.zaliha_artikli.jedinica} · stanje {zahtjev.zaliha_artikli.stanje} · zahtjev: {zahtjev.kreirao_ime}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input aria-label="Isporučena količina" type="number" min="0.001" step="0.001" placeholder={`Količina (${zahtjev.zaliha_artikli.jedinica})`} value={isporuke[zahtjev.id] ?? (zahtjev.kolicina ? String(zahtjev.kolicina) : "")} onChange={(event) => setIsporuke({ ...isporuke, [zahtjev.id]: event.target.value })} className="min-w-40 flex-1 rounded-lg border border-stone-300 p-2 text-sm" />
                      <button disabled={radi || (!isporuke[zahtjev.id] && !zahtjev.kolicina)} onClick={() => void zahtjevAction(zahtjev, "isporuci")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Potvrdi isporuku</button>
                      <button disabled={radi} onClick={() => void posaljiAkciju("/api/zaliha/zahtjevi", "PATCH", { radnja: "nema_na_stanju", zahtjevId: zahtjev.id })} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 disabled:opacity-50">Nema na stanju</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section id="stanje" className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold">Stanje robe</h2>
            <ul className="mt-3 divide-y divide-stone-100">
              {artikli.map((artikal) => {
                const ispodMinimuma = artikal.stanje <= artikal.minimum;
                return (
                  <li key={artikal.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="font-semibold">{artikal.naziv}</span>
                    <span className={`text-right text-sm ${ispodMinimuma ? "font-semibold text-red-700" : "text-stone-600"}`}>
                      {artikal.stanje} {artikal.jedinica}
                      {ispodMinimuma && <span className="block text-xs">Na minimumu</span>}
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
            className="mt-4 grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_10rem_auto]"
          >
            <label className="text-sm">Prodaja mesa po kg<select required value={prodajaId} onChange={(event) => setProdajaId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2"><option value="">Odaberite meso</option>{artikli.filter((artikal) => artikal.jedinica === "kg" && artikal.prodajna_cijena !== null).map((artikal) => <option key={artikal.id} value={artikal.id}>{artikal.naziv} · {artikal.prodajna_cijena?.toFixed(2)} KM/kg · stanje {artikal.stanje} kg</option>)}</select></label>
            <label className="text-sm">Količina (kg)<input required type="number" min="0.001" step="0.001" value={prodajaKolicina} onChange={(event) => setProdajaKolicina(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2" /></label>
            <button disabled={radi || !prodajaId} className="self-end rounded-lg bg-amber-500 px-4 py-2 font-semibold text-white disabled:opacity-50">Evidentiraj prodaju</button>
          </form>
          </>
        )}

        {uloga === "sefica" && (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold">Prijedlog nabavke (7 dana × 1,2)</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {nabavka.map((artikal) => <li key={artikal.id} className="flex justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm"><span>{artikal.naziv} · prodano {Number(artikal.sedmodnevna_prodaja).toFixed(3)} {artikal.jedinica}</span><strong>Nabaviti {Number(artikal.predlozena_nabavka).toFixed(3)} {artikal.jedinica}</strong></li>)}
            </ul>
          </section>
        )}

        {uloga === "sefica" && (
          <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-bold">Zahtjevi mesnice</h2>
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
