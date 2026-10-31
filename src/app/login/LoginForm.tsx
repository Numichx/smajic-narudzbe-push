"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UlogaZaposlenika } from "@/lib/auth/session";

const PIN_DUZINA = 8;
const TASTERI = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function LoginForm({ uloga }: { uloga: UlogaZaposlenika }) {
  const router = useRouter();
  const [ime, setIme] = useState("");
  const [pin, setPin] = useState("");
  const [greska, setGreska] = useState("");
  const [saljem, setSaljem] = useState(false);

  const trebaPin = uloga !== "konobar";

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
      router.push(`/${uloga}`);
    } catch {
      setGreska("Nema veze sa serverom.");
    } finally {
      setSaljem(false);
    }
  }

  function dodirni(taster: string) {
    if (saljem || taster === "") return;
    if (taster === "⌫") return setPin((prethodni) => prethodni.slice(0, -1));
    if (pin.length >= PIN_DUZINA) return;
    const noviPin = pin + taster;
    setPin(noviPin);
    if (noviPin.length === PIN_DUZINA) void prijava(noviPin);
  }

  return (
    <div className="mt-6">
      {uloga === "konobar" && (
        <>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Vaše ime</span>
            <input
              value={ime}
              onChange={(event) => setIme(event.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:border-amber-500"
              placeholder="npr. Emir"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-stone-700">Lični PIN (ako ste evidentirani)</span>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:border-amber-500"
              placeholder="4–8 cifara"
            />
          </label>
        </>
      )}

      {trebaPin && (
        <>
          <div className="my-6 flex justify-center gap-3" aria-label="PIN">
            {Array.from({ length: PIN_DUZINA }).map((_, index) => (
              <span
                key={index}
                className={`h-4 w-4 rounded-full border-2 ${
                  index < pin.length
                    ? "border-stone-900 bg-stone-900"
                    : "border-stone-400"
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {TASTERI.map((taster, index) =>
              taster === "" ? (
                <span key={index} />
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() => dodirni(taster)}
                  disabled={saljem}
                  className="h-16 rounded-2xl bg-white text-2xl font-semibold text-stone-900 shadow-sm active:bg-stone-200 disabled:opacity-50"
                >
                  {taster}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            onClick={() => void prijava(pin)}
            disabled={saljem || pin.length < 4}
            className="mt-4 h-14 w-full rounded-2xl bg-amber-500 text-lg font-semibold text-white disabled:opacity-40"
          >
            Uđi
          </button>
        </>
      )}

      {uloga === "konobar" && (
        <button
          type="button"
          onClick={() => void prijava("")}
          disabled={saljem || ime.trim().length < 2}
          className="mt-6 h-14 w-full rounded-2xl bg-amber-500 text-lg font-semibold text-white disabled:opacity-40"
        >
          Uđi
        </button>
      )}

      {greska && (
        <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">
          {greska}
        </p>
      )}
    </div>
  );
}
