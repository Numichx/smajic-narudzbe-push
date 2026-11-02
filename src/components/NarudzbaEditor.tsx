"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KontroleRacuna } from "./KontroleRacuna";
import { Ikona } from "./Ikona";
import { dodajOfflineAkciju } from "@/lib/offline/queue";
import { jeBesplatanPrilog, kolicinaPriloga, podrazumijevaniPrilog } from "@/lib/domain/besplatniPrilozi";

type Proizvod = {
  id: string;
  kategorija_id: string;
  naziv: string;
  cijena: number;
  jedinica: string;
  napomena_cijene: string | null;
};

type Kategorija = {
  id: string;
  naziv: string;
  proizvodi: Proizvod[];
};

type StavkaKorpe = Proizvod & {
  kolicina: number;
  napomena: string;
  prilogId: string;
  posebanPrilog: boolean;
};

export function NarudzbaEditor({ stoId }: { stoId: number }) {
  const [kategorije, setKategorije] = useState<Kategorija[]>([]);
  const [kategorijaId, setKategorijaId] = useState("");
  const [korpa, setKorpa] = useState<StavkaKorpe[]>([]);
  const [greska, setGreska] = useState("");
  const [ucitava, setUcitava] = useState(true);
  const [salje, setSalje] = useState(false);
  const [posebanPin, setPosebanPin] = useState("");

  useEffect(() => {
    let aktivno = true;

    async function ucitajMeni() {
      try {
        const odgovor = await fetch("/api/meni", { cache: "no-store" });
        const podaci = await odgovor.json();
        if (!odgovor.ok) {
          if (odgovor.status === 503) {
            const spremljeniMeni = localStorage.getItem("smajic-meni-cache");
            if (spremljeniMeni) {
              const kategorijeIzMemorije = JSON.parse(spremljeniMeni) as Kategorija[];
              if (aktivno) {
                setKategorije(kategorijeIzMemorije);
                setKategorijaId(kategorijeIzMemorije[0]?.id ?? "");
                setGreska("Radite s ranije sačuvanim menijem; server trenutno nije dostupan.");
              }
              return;
            }
          }
          if (aktivno) {
            setGreska(podaci.greska ?? "Meni nije moguće učitati.");
          }
          return;
        }

        if (aktivno) {
          setKategorije(podaci.kategorije);
          setKategorijaId(podaci.kategorije[0]?.id ?? "");
          try {
            localStorage.setItem("smajic-meni-cache", JSON.stringify(podaci.kategorije));
          } catch (error) {
            console.error("Keširanje menija nije uspjelo:", error);
          }
        }
      } catch {
        const spremljeniMeni = localStorage.getItem("smajic-meni-cache");
        if (spremljeniMeni && aktivno) {
          const kategorijeIzMemorije = JSON.parse(spremljeniMeni) as Kategorija[];
          setKategorije(kategorijeIzMemorije);
          setKategorijaId(kategorijeIzMemorije[0]?.id ?? "");
          setGreska("Offline način: koristi se ranije sačuvani meni.");
        } else if (aktivno) {
          setGreska("Nema veze sa serverom i nema sačuvanog menija.");
        }
      } finally {
        if (aktivno) setUcitava(false);
      }
    }

    void ucitajMeni();
    return () => {
      aktivno = false;
    };
  }, []);

  const aktivnaKategorija = kategorije.find(
    (kategorija) => kategorija.id === kategorijaId,
  );
  const proizvodiPriloga = useMemo(() => [
      ...(kategorije.find((kategorija) => kategorija.id === "prilozi")?.proizvodi ?? []),
      ...(kategorije.find((kategorija) => kategorija.id === "salate")?.proizvodi.filter(
        (proizvod) => proizvod.naziv.toLocaleLowerCase("bs").includes("krompir"),
      ) ?? []),
  ], [kategorije]);

  function cijenaStavke(stavka: StavkaKorpe) {
    const prilog = proizvodiPriloga.find((item) => item.id === stavka.prilogId);
    const cijenaPriloga = prilog && !stavka.posebanPrilog && jeBesplatanPrilog(stavka, prilog.naziv)
      ? 0
      : prilog?.cijena ?? 0;
    return stavka.cijena * stavka.kolicina + cijenaPriloga * kolicinaPriloga(stavka.jedinica, stavka.kolicina);
  }

  const ukupno = korpa.reduce((suma, stavka) => suma + cijenaStavke(stavka), 0);

  function dodaj(proizvod: Proizvod) {
    setKorpa((prethodna) => {
      const postojeca = prethodna.find((stavka) => stavka.id === proizvod.id);
      if (postojeca) {
        return prethodna.map((stavka) =>
          stavka.id === proizvod.id
            ? {
                ...stavka,
                kolicina: stavka.jedinica === "kg"
                  ? Math.round((stavka.kolicina + 0.1) * 10) / 10
                  : stavka.kolicina + 1,
              }
            : stavka,
        );
      }
      return [
        ...prethodna,
        {
          ...proizvod,
          kolicina: proizvod.jedinica === "kg" ? 0.1 : 1,
          napomena: "",
          prilogId: podrazumijevaniPrilog(proizvod, proizvodiPriloga)?.id ?? "",
          posebanPrilog: false,
        },
      ];
    });
  }

  function promijeniKolicinu(id: string, promjena: number) {
    setKorpa((prethodna) =>
      prethodna
        .map((stavka) => {
          if (stavka.id !== id) return stavka;
          const novaKolicina = stavka.kolicina + promjena;
          return {
            ...stavka,
            kolicina:
              stavka.jedinica === "kg"
                ? Math.round(novaKolicina * 10) / 10
                : novaKolicina,
          };
        })
        .filter((stavka) => stavka.kolicina > 0),
    );
  }

  function promijeniNapomenu(id: string, napomena: string) {
    setKorpa((prethodna) =>
      prethodna.map((stavka) =>
        stavka.id === id ? { ...stavka, napomena } : stavka,
      ),
    );
  }

  function promijeniPrilog(id: string, prilogId: string) {
    setKorpa((prethodna) =>
      prethodna.map((stavka) =>
        stavka.id === id ? { ...stavka, prilogId, posebanPrilog: false } : stavka,
      ),
    );
  }

  function promijeniPosebanPrilog(id: string, posebanPrilog: boolean) {
    setKorpa((prethodna) =>
      prethodna.map((stavka) =>
        stavka.id === id ? { ...stavka, posebanPrilog } : stavka,
      ),
    );
  }

  async function posaljiNarudzbu() {
    if (!korpa.length || salje) return;
    if (korpa.some((stavka) => stavka.posebanPrilog) && !/^\d{4,8}$/.test(posebanPin)) {
      setGreska("Unesite ispravan PIN za poseban prilog.");
      return;
    }
    setSalje(true);
    setGreska("");
    const requestId = crypto.randomUUID();
    const narudzbaPodaci = {
      requestId,
      stoId,
      posebanPin: korpa.some((stavka) => stavka.posebanPrilog) ? posebanPin : undefined,
      stavke: korpa.map(({ id, kolicina, napomena, prilogId, posebanPrilog }) => {
        const stavka = korpa.find((item) => item.id === id);
        const nazivPriloga = proizvodiPriloga.find((prilog) => prilog.id === prilogId)?.naziv ?? "";
        return {
          proizvodId: id,
          kolicina,
          napomena,
          prilozi: prilogId
            ? [{
                proizvodId: prilogId,
                standard: !posebanPrilog && stavka
                  ? jeBesplatanPrilog(stavka, nazivPriloga)
                  : false,
                poseban: posebanPrilog,
              }]
            : [],
        };
      }),
    };

    try {
      const odgovor = await fetch("/api/narudzbe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(narudzbaPodaci),
      });
      const podaci = await odgovor.json();

      if (!odgovor.ok) {
        setGreska(podaci.greska ?? "Narudžbu nije moguće poslati.");
        return;
      }

      setKorpa([]);
      setPosebanPin("");
      setGreska(`Narudžba ${podaci.narudzba.broj} je poslana.`);
    } catch {
      if (!navigator.onLine && korpa.some((stavka) => stavka.posebanPrilog)) {
        setGreska("Poseban prilog zahtijeva PIN servera i ne može se poslati offline. Sačekajte vezu da PIN ne bude sačuvan na uređaju.");
      } else if (!navigator.onLine) {
        try {
          await dodajOfflineAkciju({ tip: "narudzba", podaci: narudzbaPodaci });
          setKorpa([]);
          setPosebanPin("");
          setGreska("Narudžba je sigurno sačuvana na ovom uređaju i čeka sinhronizaciju.");
        } catch (error) {
          console.error("Čuvanje narudžbe u offline redu nije uspjelo:", error);
          setGreska("Narudžba nije poslana niti sačuvana offline. Pokušajte ponovo.");
        }
      } else {
        setGreska("Nema odgovora servera; narudžba nije poslata niti stavljena u offline red.");
      }
    } finally {
      setSalje(false);
    }
  }

  const kolicinaUKorpi = (id: string) => korpa.find((stavka) => stavka.id === id)?.kolicina ?? 0;
  const korakKolicine = (proizvod: Proizvod) => (proizvod.jedinica === "kg" ? 0.1 : 1);
  const prikazKolicine = (kolicina: number, jedinica: string) =>
    jedinica === "kg" ? kolicina.toFixed(1).replace(".", ",") : String(kolicina);

  return (
    <>
      <div className="page-head">
        <div>
          <Link href="/konobar/stolovi" className="btn-link">← Stolovi</Link>
          <h1 className="mt-1">Narudžba · Sto {stoId}</h1>
          <p>{korpa.length} stavki u narudžbi · {ukupno.toFixed(2)} KM</p>
        </div>
      </div>

      {greska && (
        <div role="status" className="alert alert-info mb-3"><Ikona naziv="info" /><div>{greska}</div></div>
      )}

      {ucitava ? (
        <p className="muted small">Učitavanje menija...</p>
      ) : (
        <>
          <div className="order-layout">
            <div className="order-main">
              <section>
                <div className="row-between mb-3">
                  <h2 className="section-title">Meni</h2>
                  <span className="section-sub">{kategorije.length} kategorija</span>
                </div>
                <nav className="menu-cats" aria-label="Kategorije menija">
                  {kategorije.map((kategorija) => (
                    <button
                      key={kategorija.id}
                      type="button"
                      onClick={() => setKategorijaId(kategorija.id)}
                      aria-pressed={kategorijaId === kategorija.id}
                      className={`pill${kategorijaId === kategorija.id ? " is-active" : ""}`}
                    >
                      {kategorija.naziv}
                    </button>
                  ))}
                </nav>
              </section>

              <div className="menu-grid">
                {aktivnaKategorija?.proizvodi.map((proizvod) => {
                  const kolicina = kolicinaUKorpi(proizvod.id);
                  const standardni = podrazumijevaniPrilog(proizvod, proizvodiPriloga);
                  return (
                    <div key={proizvod.id} className={`mitem${kolicina > 0 ? " is-selected" : ""}`}>
                      <div className="mitem-body">
                        <div className="mitem-cat">{aktivnaKategorija.naziv}</div>
                        <div className="mitem-name">{proizvod.naziv}</div>
                        <div className="tiny muted mt-1">
                          {proizvod.jedinica === "kg"
                            ? `upis u kg · ${proizvod.cijena.toFixed(2)} /kg`
                            : standardni ? `standardno: ${standardni.naziv.toLocaleLowerCase("bs")}` : "bez standardnog priloga"}
                        </div>
                      </div>
                      <div className="mitem-foot">
                        <span className="mitem-price">
                          {proizvod.cijena.toFixed(2)} <small>{proizvod.jedinica === "kg" ? "/kg" : "KM"}</small>
                        </span>
                        <div className={`stepper${kolicina > 0 ? " has-qty" : ""}`}>
                          <button
                            type="button"
                            onClick={() => promijeniKolicinu(proizvod.id, -korakKolicine(proizvod))}
                            disabled={kolicina === 0}
                            aria-label={`Smanji: ${proizvod.naziv}`}
                          >
                            −
                          </button>
                          <span className="qty">{prikazKolicine(kolicina, proizvod.jedinica)}</span>
                          <button type="button" onClick={() => dodaj(proizvod)} aria-label={`Dodaj: ${proizvod.naziv}`}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="card card-pad sticky-side">
              <div className="receipt-head">
                <div className="t">
                  <h2>Sto {stoId}</h2>
                  <span className="rid">nova narudžba</span>
                </div>
                <p className="meta">{korpa.length === 0 ? "Odaberite stavke iz menija." : `${korpa.length} stavki`}</p>
              </div>

              <div className="receipt-lines">
                {korpa.map((stavka) => (
                  <div key={stavka.id} className="rline">
                    <span className="q">{prikazKolicine(stavka.kolicina, stavka.jedinica)}{stavka.jedinica === "kg" ? "" : "×"}</span>
                    <div className="body">
                      <div className="nm">{stavka.naziv}</div>
                      <select
                        value={stavka.prilogId}
                        onChange={(event) => promijeniPrilog(stavka.id, event.target.value)}
                        className="input mt-2"
                        style={{ height: 34, fontSize: "var(--fs-12)" }}
                        aria-label={`Prilog: ${stavka.naziv}`}
                      >
                        <option value="">Bez priloga</option>
                        {proizvodiPriloga.map((prilog) => {
                          const besplatan = jeBesplatanPrilog(stavka, prilog.naziv);
                          return (
                            <option key={prilog.id} value={prilog.id}>
                              {prilog.naziv} · {besplatan && !stavka.posebanPrilog ? "uključen" : `${prilog.cijena.toFixed(2)} KM`}
                            </option>
                          );
                        })}
                      </select>
                      {stavka.prilogId && (
                        <label className="row tiny mt-1" style={{ gap: 6 }}>
                          <input
                            type="checkbox"
                            checked={stavka.posebanPrilog}
                            onChange={(event) => promijeniPosebanPrilog(stavka.id, event.target.checked)}
                          />
                          Poseban prilog ★
                        </label>
                      )}
                      <input
                        value={stavka.napomena}
                        onChange={(event) => promijeniNapomenu(stavka.id, event.target.value)}
                        maxLength={500}
                        placeholder="Napomena za kuhinju"
                        className="input mt-2"
                        style={{ height: 34, fontSize: "var(--fs-12)" }}
                      />
                    </div>
                    <span className="amt">{cijenaStavke(stavka).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {korpa.some((stavka) => stavka.posebanPrilog) && (
                <div className="field mb-3">
                  <label htmlFor="poseban-pin">PIN za poseban prilog</label>
                  <input
                    id="poseban-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={posebanPin}
                    onChange={(event) => setPosebanPin(event.target.value)}
                    className="input"
                  />
                </div>
              )}

              <div className="receipt-total">
                <span>Ukupno</span>
                <b>{ukupno.toFixed(2)} KM</b>
              </div>
              <button
                type="button"
                onClick={() => void posaljiNarudzbu()}
                disabled={korpa.length === 0 || salje}
                className="btn btn-primary btn-block btn-lg"
              >
                {salje ? "Šaljem..." : "Pošalji narudžbu"}
              </button>
            </aside>
          </div>

          <div className="mt-6">
            <KontroleRacuna stoId={stoId} />
          </div>
        </>
      )}
    </>
  );
}
