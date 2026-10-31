"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { KontroleRacuna } from "./KontroleRacuna";
import { dodajOfflineAkciju } from "@/lib/offline/queue";

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

  function dozvoljenBesplatanPrilog(stavka: Proizvod, nazivPriloga: string) {
      const naziv = stavka.naziv.toLocaleLowerCase("bs");
      const prilog = nazivPriloga.toLocaleLowerCase("bs");
      if (
        ["jela-po-narudzbi", "piletina"].includes(stavka.kategorija_id) &&
        !naziv.includes("mućkalica")
      ) return prilog === "pomfrit";
      if (stavka.kategorija_id === "kuhana-jela" && naziv.startsWith("lešo teletina")) {
        return prilog === "povrće";
      }
      if (stavka.kategorija_id === "kuhana-jela" && naziv.startsWith("gulaš")) {
        return ["pire", "riža", "makaroni"].includes(prilog);
      }
      if (stavka.kategorija_id === "riba") {
        return ["pomfrit", "krompir salata"].includes(prilog);
      }
      if (stavka.kategorija_id === "pecenja" && naziv.includes("teletina ispod sača")) {
        return ["pekarski krompir", "pomfrit"].includes(prilog);
      }
      if (
        stavka.kategorija_id === "rostilj" &&
        !naziv.includes("ćevap") &&
        !naziv.includes("sudžuk")
      ) return prilog === "pomfrit";
      return false;
  }

  function standardniPrilogId(proizvod: Proizvod) {
      const naziv = proizvod.naziv.toLocaleLowerCase("bs");
      let standard: string | undefined;
      if (["jela-po-narudzbi", "piletina"].includes(proizvod.kategorija_id) && !naziv.includes("mućkalica")) standard = "Pomfrit";
      if (proizvod.kategorija_id === "kuhana-jela" && naziv.startsWith("lešo teletina")) standard = "Povrće";
      if (proizvod.kategorija_id === "rostilj" && !naziv.includes("ćevap") && !naziv.includes("sudžuk")) standard = "Pomfrit";
      if (proizvod.kategorija_id === "riba") standard = "Pomfrit";
      if (proizvod.kategorija_id === "pecenja" && naziv.includes("teletina ispod sača")) standard = "Pekarski krompir";
      return proizvodiPriloga.find((prilog) => prilog.naziv === standard)?.id ?? "";
  }

  const ukupno = useMemo(
      () =>
        korpa.reduce(
          (suma, stavka) => {
            const prilog = proizvodiPriloga.find((item) => item.id === stavka.prilogId);
            const cijenaPriloga = prilog && !stavka.posebanPrilog &&
              dozvoljenBesplatanPrilog(stavka, prilog.naziv)
              ? 0
              : prilog?.cijena ?? 0;
            return suma + (stavka.cijena + cijenaPriloga) * stavka.kolicina;
          },
        0,
      ),
      [korpa, proizvodiPriloga],
  );

  function dodaj(proizvod: Proizvod) {
    setKorpa((prethodna) => {
      const postojeca = prethodna.find((stavka) => stavka.id === proizvod.id);
      if (postojeca) {
        return prethodna.map((stavka) =>
          stavka.id === proizvod.id
            ? {
                ...stavka,
                kolicina: stavka.kolicina + (stavka.jedinica === "kg" ? 0.1 : 1),
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
          prilogId: standardniPrilogId(proizvod),
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
                  ? dozvoljenBesplatanPrilog(stavka, nazivPriloga)
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

  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-5 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <Link
              href="/konobar/stolovi"
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              ← Stolovi
            </Link>
            <h1 className="mt-1 text-2xl font-bold">Sto {stoId} · Meni</h1>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm">
            {korpa.length} stavki
          </span>
        </header>

        {greska && (
          <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {greska}
          </p>
        )}

        {ucitava ? (
          <p className="text-sm text-stone-600">Učitavanje menija...</p>
        ) : (
          <>
            <nav className="mb-5 flex gap-2 overflow-x-auto pb-2" aria-label="Kategorije menija">
              {kategorije.map((kategorija) => (
                <button
                  key={kategorija.id}
                  type="button"
                  onClick={() => setKategorijaId(kategorija.id)}
                  aria-pressed={kategorijaId === kategorija.id}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    kategorijaId === kategorija.id
                      ? "bg-stone-900 text-white"
                      : "border border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {kategorija.naziv}
                </button>
              ))}
            </nav>

            <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
              <section>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {aktivnaKategorija?.proizvodi.map((proizvod) => (
                    <li key={proizvod.id}>
                      <button
                        type="button"
                        onClick={() => dodaj(proizvod)}
                        className="flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-amber-400"
                      >
                        <span>
                          <span className="block font-medium">{proizvod.naziv}</span>
                          <span className="text-xs text-stone-500">
                            {proizvod.jedinica === "kg" ? "Cijena po kg" : "Dodaj u narudžbu"}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold">
                          {proizvod.cijena.toFixed(2)} KM
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h2 className="text-lg font-bold">Narudžba</h2>
                {korpa.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">Odaberite stavke iz menija.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-stone-100">
                    {korpa.map((stavka) => (
                      <li key={stavka.id} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-medium">{stavka.naziv}</span>
                          <span className="shrink-0 text-sm">
                            {(stavka.cijena * stavka.kolicina).toFixed(2)} KM
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              promijeniKolicinu(
                                stavka.id,
                                stavka.jedinica === "kg" ? -0.1 : -1,
                              )
                            }
                            aria-label={`Smanji količinu: ${stavka.naziv}`}
                            className="h-8 w-8 rounded-lg border border-stone-300"
                          >
                            −
                          </button>
                          <span className="min-w-16 text-center text-sm">
                            {stavka.kolicina.toFixed(stavka.jedinica === "kg" ? 1 : 0)}
                            {stavka.jedinica === "kg" ? " kg" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              promijeniKolicinu(
                                stavka.id,
                                stavka.jedinica === "kg" ? 0.1 : 1,
                              )
                            }
                            aria-label={`Povećaj količinu: ${stavka.naziv}`}
                            className="h-8 w-8 rounded-lg border border-stone-300"
                          >
                            +
                          </button>
                        </div>
                        <label className="mt-2 block text-sm">
                          Prilog
                          <select
                            value={stavka.prilogId}
                            onChange={(event) => promijeniPrilog(stavka.id, event.target.value)}
                            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
                          >
                            <option value="">Bez priloga</option>
                            {proizvodiPriloga.map((prilog) => {
                              const besplatan = dozvoljenBesplatanPrilog(stavka, prilog.naziv);
                              return (
                                <option key={prilog.id} value={prilog.id}>
                                  {prilog.naziv} · {besplatan && !stavka.posebanPrilog ? "uključen" : `${prilog.cijena.toFixed(2)} KM`}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                        {stavka.prilogId && (
                          <label className="mt-2 flex items-center gap-2 text-sm">
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
                          onChange={(event) =>
                            promijeniNapomenu(stavka.id, event.target.value)
                          }
                          maxLength={500}
                          placeholder="Napomena za kuhinju"
                          className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {korpa.some((stavka) => stavka.posebanPrilog) && (
                  <label className="mt-3 block text-sm">
                    PIN za poseban prilog
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      value={posebanPin}
                      onChange={(event) => setPosebanPin(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                    />
                  </label>
                )}
                <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 font-bold">
                  <span>Ukupno</span>
                  <span>{ukupno.toFixed(2)} KM</span>
                </div>
                <button
                  type="button"
                  onClick={() => void posaljiNarudzbu()}
                  disabled={korpa.length === 0 || salje}
                  className="mt-4 min-h-12 w-full rounded-xl bg-amber-500 px-4 font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
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
      </div>
    </main>
  );
}
