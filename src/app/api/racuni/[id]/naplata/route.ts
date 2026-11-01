import { NextResponse } from "next/server";
import { porukaZaKorisnika } from "@/lib/api/greske";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoPayBill } from "@/lib/demo/store";

const NaplataSchema = z.object({
  gostDao: z.number().nonnegative(),
  vraceniKusur: z.number().nonnegative(),
  nacin: z.enum(["gotovina", "kartica", "kombinovano", "dug"]),
  gostDuznik: z.string().trim().max(100).optional(),
  podijeljenoNa: z.number().int().positive().max(100).optional(),
});

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
  const rezultat = NaplataSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Podaci naplate nisu ispravni." }, { status: 400 });
  }

  if (rezultat.data.nacin === "dug" && !rezultat.data.gostDuznik?.trim()) {
    return NextResponse.json({ greska: "Unesite ime gosta za dug." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const naplata = await demoPayBill({
        billId: id,
        actor: sesija.ime,
        given: rezultat.data.gostDao,
        change: rezultat.data.vraceniKusur,
        method: rezultat.data.nacin,
        debtor: rezultat.data.gostDuznik,
        split: rezultat.data.podijeljenoNa,
      });
      return NextResponse.json(naplata);
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Naplata nije uspjela." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("plati_racun", {
    p_racun_id: id,
    p_gost_dao: rezultat.data.gostDao,
    p_vraceni_kusur: rezultat.data.vraceniKusur,
    p_nacin: rezultat.data.nacin,
    p_naplatio_ime: sesija.ime,
    p_gost_duznik: rezultat.data.gostDuznik ?? null,
    p_podijeljeno_na: rezultat.data.podijeljenoNa ?? null,
  });

  if (error) {
    console.error("Naplata računa nije uspjela:", error);
    return NextResponse.json({ greska: porukaZaKorisnika(error) }, { status: 422 });
  }

  return NextResponse.json({ naplata: data });
}
