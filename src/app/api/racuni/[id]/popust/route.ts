import { NextResponse } from "next/server";
import { z } from "zod";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import {
  izvorPokusaja,
  provjeriOgranicenjePina,
  zabiljeziPinPokusaj,
} from "@/lib/auth/pinOgranicenje";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoDiscountBill, demoVerifyPin } from "@/lib/demo/store";
import { RAZLOZI_POPUSTA } from "@/lib/domain/racun";

const PopustSchema = z.object({
  procenat: z.number().min(0).max(100),
  razlog: z.enum(RAZLOZI_POPUSTA),
  pin: z.string().regex(/^\d{4,8}$/),
});

/** Popust, častimo ili obrok osoblja na cijeli račun; odobrava šefica svojim PIN-om. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Prijavite se kao konobar." }, { status: 401 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ greska: "Neispravan račun." }, { status: 400 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = PopustSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Unesite popust, razlog i PIN šefice." }, { status: 400 });
  }
  const { procenat, razlog, pin } = rezultat.data;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    if (!(await demoVerifyPin("sefica", pin))) {
      return NextResponse.json({ greska: "Pogrešan PIN šefice." }, { status: 401 });
    }
    try {
      return NextResponse.json({ popust: await demoDiscountBill({ billId: id, percent: procenat, reason: razlog, actor: sesija.ime }) });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Popust nije sačuvan." }, { status: 422 });
    }
  }

  // Ovo je PIN šefice, pa važi isto zaključavanje kao pri prijavi.
  const izvor = await izvorPokusaja(request);
  const zakljucano = await provjeriOgranicenjePina(supabase, izvor);
  if (zakljucano) return zakljucano;
  const { data: ispravan, error: greskaPina } = await supabase.rpc("provjeri_pin", {
    p_kljuc: "sefica",
    p_pin: pin,
  });
  if (greskaPina) {
    console.error("Provjera PIN-a šefice nije uspjela:", greskaPina);
    return NextResponse.json({ greska: "PIN trenutno nije moguće provjeriti." }, { status: 503 });
  }
  await zabiljeziPinPokusaj(supabase, izvor, ispravan === true);
  if (ispravan !== true) {
    return NextResponse.json({ greska: "Pogrešan PIN šefice." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("odobri_popust", {
    p_racun_id: id,
    p_procenat: procenat,
    p_razlog: razlog,
    p_akter_ime: sesija.ime,
    p_odobrio_ime: "šefica",
  });
  if (error) {
    console.error("Popust nije sačuvan:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }
  return NextResponse.json({ popust: data });
}
