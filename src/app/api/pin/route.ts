import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isUlogaZaposlenika } from "@/lib/auth/session";
import { kreirajTokenSesije } from "@/lib/auth/sessionToken";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoEmployeeLogin, demoVerifyPin } from "@/lib/demo/store";
import {
  ipKlijenta,
  provjeriOgranicenjePina,
  zabiljeziPinPokusaj,
} from "@/lib/auth/pinOgranicenje";

const TRAJANJE_SESIJE = 60 * 60 * 12;

export async function POST(request: Request) {
  let tijelo: unknown;

  try {
    tijelo = await request.json();
  } catch {
    return NextResponse.json({ greska: "Neispravan zahtjev." }, { status: 400 });
  }

  if (typeof tijelo !== "object" || tijelo === null) {
    return NextResponse.json({ greska: "Neispravan zahtjev." }, { status: 400 });
  }

  const { uloga, ime, pin } = tijelo as {
    uloga?: unknown;
    ime?: unknown;
    pin?: unknown;
  };

  if (!isUlogaZaposlenika(uloga)) {
    return NextResponse.json({ greska: "Nepoznata uloga." }, { status: 400 });
  }

  const imeZaposlenika = typeof ime === "string" ? ime.trim() : "";
  const supabase = createSupabaseAdminClient();
  let idZaposlenika = crypto.randomUUID();
  let imeZaSesiju = imeZaposlenika;
  const ip = ipKlijenta(request);

  if (uloga === "konobar") {
    if (imeZaposlenika.length < 2 || imeZaposlenika.length > 80) {
      return NextResponse.json({ greska: "Upišite ime." }, { status: 400 });
    }
    if (supabase) {
      if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
        return NextResponse.json({ greska: "Unesite PIN koji vam je dodijelila šefica." }, { status: 401 });
      }
      const zakljucano = await provjeriOgranicenjePina(supabase, ip);
      if (zakljucano) return zakljucano;
      const { data: zaposlenik, error } = await supabase.rpc("autentificiraj_konobara", {
        p_ime: imeZaposlenika,
        p_pin: pin,
      });
      if (error) {
        console.error("Provjera prijave konobara nije uspjela:", error);
        return NextResponse.json({ greska: "Prijavu trenutno nije moguće provjeriti." }, { status: 503 });
      }
      if (!zaposlenik) {
        await zabiljeziPinPokusaj(supabase, ip, false);
        return NextResponse.json({ greska: "Konobar nije unesen ili je deaktiviran." }, { status: 401 });
      }
      if (typeof zaposlenik === "object" && "pogresan_pin" in zaposlenik) {
        await zabiljeziPinPokusaj(supabase, ip, false);
        return NextResponse.json({ greska: "Pogrešan PIN." }, { status: 401 });
      }
      await zabiljeziPinPokusaj(supabase, ip, true);
      if (
        typeof zaposlenik !== "object" ||
        !("id" in zaposlenik) ||
        !("ime" in zaposlenik) ||
        typeof zaposlenik.id !== "string" ||
        typeof zaposlenik.ime !== "string"
      ) {
        console.error("Provjera prijave konobara vratila je neočekivane podatke.");
        return NextResponse.json({ greska: "Podaci zaposlenika nisu ispravni." }, { status: 500 });
      }
      idZaposlenika = zaposlenik.id;
      imeZaSesiju = zaposlenik.ime;
    } else {
      if (typeof pin !== "string" || (pin !== "" && !/^\d{4,8}$/.test(pin))) {
        return NextResponse.json({ greska: "PIN mora imati 4 do 8 cifara." }, { status: 401 });
      }
      const zaposlenik = await demoEmployeeLogin(imeZaposlenika, pin);
      if (!zaposlenik) return NextResponse.json({ greska: "Konobar nije evidentiran ili je PIN pogrešan." }, { status: 401 });
      idZaposlenika = zaposlenik.id;
      imeZaSesiju = zaposlenik.ime;
    }
  } else {
    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ greska: "PIN nije ispravan." }, { status: 401 });
    }

    if (supabase) {
      const zakljucano = await provjeriOgranicenjePina(supabase, ip);
      if (zakljucano) return zakljucano;
      const { data: pinJeIspravan, error } = await supabase.rpc("provjeri_pin", {
        p_kljuc: uloga === "sefica" ? "sefica" : "osoblje",
        p_pin: pin,
      });
      if (error) {
        console.error("Provjera PIN-a nije uspjela:", error);
        return NextResponse.json({ greska: "PIN trenutno nije moguće provjeriti." }, { status: 503 });
      }
      if (!pinJeIspravan) {
        await zabiljeziPinPokusaj(supabase, ip, false);
        return NextResponse.json({ greska: "Pogrešan PIN." }, { status: 401 });
      }
      await zabiljeziPinPokusaj(supabase, ip, true);
    } else {
      if (!await demoVerifyPin(uloga, pin)) {
        return NextResponse.json({ greska: "Pogrešan PIN." }, { status: 401 });
      }
    }
  }

  if (uloga !== "konobar") {
    imeZaSesiju = {
      konobar: "",
      kuhinja: "Kuhinja",
      pecenjara: "Pečenjara",
      sank: "Šank",
      mesnica: "Mesnica",
      sefica: "Šefica",
    }[uloga];
  }

  if (uloga !== "konobar" && !imeZaSesiju) {
      return NextResponse.json({ greska: "Pogrešan PIN." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const tokenSesije = kreirajTokenSesije({
    id: idZaposlenika,
    ime: imeZaSesiju,
    uloga,
    // Konobar se prijavljuje kao zaposlenik iz baze; ostale uloge PIN-om uloge.
    ...(uloga === "konobar" ? { licni: true as const } : {}),
  });

  if (!tokenSesije) {
    return NextResponse.json(
      { greska: "Nedostaje SESSION_SECRET za sigurnu sesiju." },
      { status: 503 },
    );
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRAJANJE_SESIJE,
  };

  cookieStore.set("sesija", tokenSesije, cookieOptions);

  return NextResponse.json({ ok: true });
}
