import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isUlogaZaposlenika } from "@/lib/auth/session";
import { kreirajTokenSesije } from "@/lib/auth/sessionToken";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoPersonalLogin } from "@/lib/demo/store";
import {
  ipKlijenta,
  provjeriOgranicenjePina,
  zabiljeziPinPokusaj,
} from "@/lib/auth/pinOgranicenje";

const TRAJANJE_SESIJE = 60 * 60 * 12;

type Pogodak = { id: string; ime: string; uloga: string } | { dvosmislen: true } | null;

// Prijava ličnim PIN-om: zaposlenik kojeg je šefica unijela upisuje samo svoj
// PIN, a odgovor kaže na koji ekran (ulogu) ga treba odvesti.
export async function POST(request: Request) {
  const tijelo: unknown = await request.json().catch(() => null);
  const pin =
    typeof tijelo === "object" && tijelo !== null && "pin" in tijelo
      ? (tijelo as { pin: unknown }).pin
      : undefined;
  if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ greska: "PIN mora imati 4 do 8 cifara." }, { status: 400 });
  }

  let pogodak: Pogodak;
  const supabase = createSupabaseAdminClient();
  if (supabase) {
    const ip = ipKlijenta(request);
    const zakljucano = await provjeriOgranicenjePina(supabase, ip);
    if (zakljucano) return zakljucano;

    const { data, error } = await supabase.rpc("autentificiraj_zaposlenika", { p_pin: pin });
    if (error) {
      console.error("Prijava ličnim PIN-om nije uspjela:", error);
      return NextResponse.json({ greska: "PIN trenutno nije moguće provjeriti." }, { status: 503 });
    }
    pogodak = (data ?? null) as Pogodak;
    await zabiljeziPinPokusaj(supabase, ip, pogodak !== null);
  } else {
    pogodak = await demoPersonalLogin(pin);
  }

  if (!pogodak) {
    return NextResponse.json({ greska: "Pogrešan PIN ili zaposlenik nije aktivan." }, { status: 401 });
  }
  if ("dvosmislen" in pogodak) {
    return NextResponse.json(
      { greska: "Ovaj PIN ima više zaposlenika. Šefica treba dodijeliti različite PIN-ove." },
      { status: 409 },
    );
  }
  if (
    typeof pogodak.id !== "string" ||
    typeof pogodak.ime !== "string" ||
    !isUlogaZaposlenika(pogodak.uloga)
  ) {
    console.error("Prijava ličnim PIN-om vratila je neočekivane podatke.");
    return NextResponse.json({ greska: "Podaci zaposlenika nisu ispravni." }, { status: 500 });
  }

  const token = kreirajTokenSesije({
    id: pogodak.id,
    ime: pogodak.ime,
    uloga: pogodak.uloga,
    licni: true,
  });
  if (!token) {
    return NextResponse.json({ greska: "Nedostaje SESSION_SECRET za sigurnu sesiju." }, { status: 503 });
  }

  const cookieStore = await cookies();
  cookieStore.set("sesija", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRAJANJE_SESIJE,
  });

  return NextResponse.json({ ok: true, uloga: pogodak.uloga, ime: pogodak.ime });
}
