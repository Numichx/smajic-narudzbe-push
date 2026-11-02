"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { NAZIVI_ULOGA, type UlogaZaposlenika } from "@/lib/auth/session";
import { Ikona, type NazivIkone } from "./Ikona";
import { PrekidacTeme } from "./PrekidacTeme";

type StavkaMenija = { href: string; naziv: string; ikona: NazivIkone };

const MENI: Record<UlogaZaposlenika, StavkaMenija[]> = {
  konobar: [
    { href: "/konobar/stolovi", naziv: "Stolovi", ikona: "stolovi" },
    { href: "/konobar/racuni", naziv: "Računi", ikona: "racuni" },
    { href: "/konobar/rezervacije", naziv: "Rezervacije", ikona: "rezervacije" },
    { href: "/konobar/statistika", naziv: "Statistika", ikona: "statistika" },
  ],
  kuhinja: [
    { href: "/kuhinja", naziv: "Narudžbe", ikona: "narudzbe" },
    { href: "/kuhinja#zbirno", naziv: "Zbirno", ikona: "zbirno" },
    { href: "/kuhinja#zahtjevi", naziv: "Mesnica", ikona: "mesnica" },
  ],
  pecenjara: [
    { href: "/pecenjara", naziv: "Narudžbe", ikona: "narudzbe" },
    { href: "/pecenjara#smjena", naziv: "Popis smjene", ikona: "smjena" },
    { href: "/pecenjara#dug", naziv: "Dug konobara", ikona: "dug" },
  ],
  sank: [
    { href: "/sank", naziv: "Narudžbe", ikona: "narudzbe" },
    { href: "/sank#smjena", naziv: "Smjena", ikona: "smjena" },
    { href: "/sank#dopune", naziv: "Dopune", ikona: "stanje" },
  ],
  mesnica: [
    { href: "/mesnica", naziv: "Zahtjevi", ikona: "mesnica" },
    { href: "/mesnica#stanje", naziv: "Stanje", ikona: "stanje" },
    { href: "/mesnica#prodaja", naziv: "Prodaja", ikona: "prodaja" },
  ],
  sefica: [
    { href: "/sefica", naziv: "Smjena i dan", ikona: "zatvaranje" },
    { href: "/sefica/izvjestaj", naziv: "Izvještaj", ikona: "statistika" },
    { href: "/sefica/zaliha", naziv: "Zaliha i nabavka", ikona: "stanje" },
    { href: "/sefica/administracija", naziv: "Administracija", ikona: "administracija" },
  ],
};

function jeAktivna(href: string, putanja: string | undefined) {
  if (putanja === undefined || href.includes("#")) return false;
  // Početna stranica uloge (npr. /sefica) aktivna je samo na tačnoj adresi,
  // a ostale stavke i na podstranicama (npr. /konobar/stolovi/4).
  const pocetnaUloge = href.split("/").length === 2;
  return putanja === href || (!pocetnaUloge && putanja.startsWith(`${href}/`));
}

function aktivnaStavka(uloga: UlogaZaposlenika, putanja: string | undefined) {
  return MENI[uloga].find((stavka) => jeAktivna(stavka.href, putanja));
}

function BocniMeni({ uloga, putanja }: { uloga: UlogaZaposlenika; putanja?: string }) {
  return (
    <nav className="side-nav" aria-label="Glavna navigacija">
      {MENI[uloga].map((stavka) => {
        const aktivna = jeAktivna(stavka.href, putanja);
        return (
          <Link key={stavka.href} href={stavka.href} className={aktivna ? "is-active" : undefined} aria-current={aktivna ? "page" : undefined}>
            <Ikona naziv={stavka.ikona} />
            <span>{stavka.naziv}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function DonjiMeni({ uloga, putanja }: { uloga: UlogaZaposlenika; putanja?: string }) {
  return (
    <nav className="bottom-nav" aria-label="Navigacija">
      {MENI[uloga].map((stavka) => (
        <Link key={stavka.href} href={stavka.href} className={jeAktivna(stavka.href, putanja) ? "is-active" : undefined}>
          <Ikona naziv={stavka.ikona} />
          {stavka.naziv}
        </Link>
      ))}
    </nav>
  );
}

function NaslovTrake({ uloga, putanja }: { uloga: UlogaZaposlenika; putanja?: string }) {
  return (
    <div className="topbar-title">
      {aktivnaStavka(uloga, putanja)?.naziv ?? NAZIVI_ULOGA[uloga]}
      <small className="desktop-only">Smajić POS · {NAZIVI_ULOGA[uloga]}</small>
    </div>
  );
}

function SaPutanjom({ children }: { children: (putanja: string) => ReactNode }) {
  return children(usePathname());
}

function Korisnik({ uloga }: { uloga: UlogaZaposlenika }) {
  const router = useRouter();
  const [ime, setIme] = useState("");

  // Provjera se ponavlja: kad sesija istekne ili zaposlenik bude deaktiviran, ekran ne
  // smije ostati na starim podacima nego vodi na prijavu. Bez veze se ništa ne dešava,
  // jer rad bez interneta mora ostati moguć.
  useEffect(() => {
    let aktivno = true;
    async function provjeri() {
      const odgovor = await fetch("/api/sesija", { cache: "no-store" }).catch(() => null);
      if (!aktivno || !odgovor) return;
      const sesija = odgovor.ok
        ? await odgovor.json().catch(() => null) as { ime: string; uloga: string } | null
        : null;
      if (!aktivno) return;
      if (odgovor.status === 401 || (sesija && sesija.uloga !== uloga)) {
        router.replace(`/login?uloga=${uloga}`);
      } else if (sesija) {
        setIme(sesija.ime);
      }
    }
    void provjeri();
    const interval = window.setInterval(() => void provjeri(), 60_000);
    return () => {
      aktivno = false;
      window.clearInterval(interval);
    };
  }, [router, uloga]);

  const prikaz = ime || NAZIVI_ULOGA[uloga];
  return (
    <div className="user">
      <div className="user-meta"><b>{prikaz}</b><span>{NAZIVI_ULOGA[uloga]}</span></div>
      <div className="avatar" aria-hidden="true">{prikaz.charAt(0).toLocaleUpperCase("bs")}</div>
    </div>
  );
}

function useOdjava() {
  const router = useRouter();
  return async () => {
    await fetch("/api/sesija", { method: "DELETE" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  };
}

function Odjava() {
  const odjavi = useOdjava();
  return (
    <div className="side-foot">
      <Link href="/" onClick={(event) => { event.preventDefault(); void odjavi(); }}>
        <Ikona naziv="odjava" />
        <span>Odjava</span>
      </Link>
    </div>
  );
}

function OdjavaMobilni() {
  const odjavi = useOdjava();
  return (
    <button type="button" className="btn btn-ghost btn-sm mobile-only" onClick={() => void odjavi()} aria-label="Odjava">
      <Ikona naziv="odjava" />
    </button>
  );
}

export function AppShell({ uloga, children }: { uloga: UlogaZaposlenika; children: ReactNode }) {
  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="side-brand">
            <div className="side-mark">S</div>
            <div><b>Smajić</b><span>POS</span></div>
          </div>
          <Suspense fallback={<BocniMeni uloga={uloga} />}>
            <SaPutanjom>{(putanja) => <BocniMeni uloga={uloga} putanja={putanja} />}</SaPutanjom>
          </Suspense>
          <Odjava />
        </aside>
        <div className="main">
          <header className="topbar">
            <Suspense fallback={<NaslovTrake uloga={uloga} />}>
              <SaPutanjom>{(putanja) => <NaslovTrake uloga={uloga} putanja={putanja} />}</SaPutanjom>
            </Suspense>
            <div className="topbar-spacer" />
            <PrekidacTeme />
            <Korisnik uloga={uloga} />
            <OdjavaMobilni />
          </header>
          <div className="content">{children}</div>
        </div>
      </div>
      <Suspense fallback={<DonjiMeni uloga={uloga} />}>
        <SaPutanjom>{(putanja) => <DonjiMeni uloga={uloga} putanja={putanja} />}</SaPutanjom>
      </Suspense>
    </>
  );
}
