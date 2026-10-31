import Link from "next/link";
import { Ikona, type NazivIkone } from "@/components/Ikona";
import { PrekidacTeme } from "@/components/PrekidacTeme";
import type { UlogaZaposlenika } from "@/lib/auth/session";

const ULOGE: { id: UlogaZaposlenika; naziv: string; opis: string; ikona: NazivIkone }[] = [
  { id: "konobar", naziv: "Konobar", opis: "Ime i lični PIN. Stolovi, meni, naplata, rezervacije.", ikona: "konobar" },
  { id: "kuhinja", naziv: "Kuhinja", opis: "PIN osoblja. Narudžbe po statusu i zbirno.", ikona: "kuhinja" },
  { id: "pecenjara", naziv: "Pečenjara", opis: "PIN osoblja. Statusi, cijena za konobara, popis.", ikona: "pecenjara" },
  { id: "sank", naziv: "Šank", opis: "PIN osoblja. Pića, popis i dopune.", ikona: "sank" },
  { id: "mesnica", naziv: "Mesnica", opis: "PIN osoblja. Zahtjevi, isporuka, prodaja.", ikona: "mesnica" },
  { id: "sefica", naziv: "Šefica", opis: "PIN šefice. Izvještaji, zalihe i administracija.", ikona: "sefica" },
];

export default function Pocetna() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-head">
          <div className="side-brand" style={{ padding: 0 }}>
            <div className="side-mark">S</div>
            <div><b>Smajić</b><span>POS · Roštilj &amp; kuhinja</span></div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <PrekidacTeme />
            <span className="badge badge-muted desktop-only">jedan uređaj = jedna uloga</span>
          </div>
        </div>
        <div className="auth-body">
          <h1 className="auth-title">Odaberi ulogu uređaja</h1>
          <p className="auth-sub">Svaki uređaj otvara jednu ulogu. Podaci se dijele između stanica.</p>
          <div className="role-grid mt-6">
            {ULOGE.map((uloga) => (
              <Link key={uloga.id} href={`/login?uloga=${uloga.id}`} className="role-card">
                <div className="role-ico"><Ikona naziv={uloga.ikona} /></div>
                <h3>{uloga.naziv}</h3>
                <p>{uloga.opis}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
