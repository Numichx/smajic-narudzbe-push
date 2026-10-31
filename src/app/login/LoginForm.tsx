"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UlogaZaposlenika } from "@/lib/auth/session";

const PIN_DUZINA = 8;
const TASTERI = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

export function LoginForm({ uloga }: { uloga: UlogaZaposlenika }) {
  const router = useRouter();
  const [ime, setIme] = useState("");
  const [pin, setPin] = useState("");
  const [greska, setGreska] = useState("");
  const [saljem, setSaljem] = useState(false);

  const konobar = uloga === "konobar";
  const mozeUci = !saljem && (konobar ? ime.trim().length >= 2 : pin.length >= 4);

  async function prijava(zaPin: string) {
    setSaljem(true);
    setGreska("");
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uloga, ime: ime.trim(), pin: zaPin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGreska(data.greska ?? "Prijava nije uspjela.");
        setPin("");
        return;
      }
      router.push(konobar ? "/konobar/stolovi" : `/${uloga}`);
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setSaljem(false);
    }
  }

  function dodirni(taster: string) {
    if (saljem) return;
    if (taster === "⌫") return setPin((prethodni) => prethodni.slice(0, -1));
    if (taster === "C") return setPin("");
    if (pin.length >= PIN_DUZINA) return;
    const noviPin = pin + taster;
    setPin(noviPin);
    if (!konobar && noviPin.length === PIN_DUZINA) void prijava(noviPin);
  }

  return (
    <form
      className="login-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (mozeUci) void prijava(pin);
      }}
    >
      <h2>Prijava</h2>
      <p className="sub">
        {konobar
          ? "Unesite ime. PIN se traži kad vas šefica doda u osoblje."
          : "Unesite PIN osoblja za ovu stanicu."}
      </p>

      {konobar && (
        <div className="field mt-4">
          <label htmlFor="prijava-ime">Ime</label>
          <input
            id="prijava-ime"
            className="input lg"
            value={ime}
            onChange={(event) => setIme(event.target.value)}
            autoComplete="given-name"
            placeholder="npr. Emir"
          />
        </div>
      )}

      <div className="row-between mt-4 mb-2">
        <span className="tiny muted" style={{ fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>
          PIN
        </span>
        <span className="tiny muted">4–8 cifara</span>
      </div>
      <div className="pin-dots mb-3" aria-label={`Uneseno cifara: ${pin.length}`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, index) => (
          <i key={index} className={index < pin.length ? "on" : undefined} />
        ))}
      </div>
      <div className="keypad">
        {TASTERI.map((taster) => (
          <button
            key={taster}
            type="button"
            className={taster === "C" || taster === "⌫" ? "key fn" : "key"}
            onClick={() => dodirni(taster)}
            disabled={saljem}
            aria-label={taster === "⌫" ? "Obriši cifru" : taster === "C" ? "Obriši PIN" : taster}
          >
            {taster}
          </button>
        ))}
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg mt-3" disabled={!mozeUci}>
        {saljem ? "Prijavljujem..." : "Uđi"}
      </button>

      {greska && (
        <div role="alert" className="alert alert-danger mt-3"><div>{greska}</div></div>
      )}
      <p className="tiny muted mt-3" style={{ textAlign: "center" }}>PIN mijenja šefica u Administraciji.</p>
    </form>
  );
}
