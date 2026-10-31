"use client";

import { useEffect, useState } from "react";
import { Ikona } from "./Ikona";

type Tema = "light" | "dark";

export function PrekidacTeme({ samoIkona = false }: { samoIkona?: boolean }) {
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTema(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function promijeni() {
    const nova: Tema = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nova);
    try {
      localStorage.setItem("smajic-theme", nova);
    } catch {
      // Privatni režim preglednika: tema vrijedi do zatvaranja stranice.
    }
    setTema(nova);
  }

  return (
    <button
      type="button"
      onClick={promijeni}
      className={`theme-toggle${samoIkona ? " is-icon" : ""}`}
      aria-pressed={tema === "dark"}
      title={tema === "dark" ? "Prebaci na svijetlu temu" : "Prebaci na tamnu temu"}
    >
      <Ikona naziv="mjesec" className="t-moon" />
      <Ikona naziv="sunce" className="t-sun" />
      <span className="t-label">Tema</span>
    </button>
  );
}
