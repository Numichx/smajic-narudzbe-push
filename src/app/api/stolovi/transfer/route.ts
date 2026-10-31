import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoTransfer } from "@/lib/demo/store";

const PremjestanjeSchema = z.object({
  stoIz: z.number().int().min(1).max(20),
  stoU: z.number().int().min(1).max(20),
  podijeliRacunId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Prijavite se kao konobar." }, { status: 401 });
  }

  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = PremjestanjeSchema.safeParse(tijelo);
  if (!rezultat.success || rezultat.data.stoIz === rezultat.data.stoU) {
    return NextResponse.json({ greska: "Izaberite dva različita ispravna stola." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const transfer = await demoTransfer({
        from: rezultat.data.stoIz,
        to: rezultat.data.stoU,
        splitBillId: rezultat.data.podijeliRacunId,
      });
      return NextResponse.json({ rezultat: transfer });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Račun nije moguće premjestiti." }, { status: 422 });
    }
  }

  const { data, error } = rezultat.data.podijeliRacunId
    ? await supabase.rpc("dodaj_sto_na_racun", {
        p_racun_id: rezultat.data.podijeliRacunId,
        p_sto_id: rezultat.data.stoU,
      })
    : await supabase.rpc("premjesti_ili_spoji_sto", {
        p_sto_iz: rezultat.data.stoIz,
        p_sto_u: rezultat.data.stoU,
      });

  if (error) {
    console.error("Premještanje/spajanje stolova nije uspjelo:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ rezultat: data });
}
