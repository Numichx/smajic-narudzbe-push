import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoMeatSale } from "@/lib/demo/store";

const ProdajaSchema = z.object({
  zalihaId: z.string().uuid(),
  kolicina: z.number().positive().max(1000),
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "mesnica") {
    return NextResponse.json({ greska: "Samo mesnica može evidentirati prodaju mesa." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = ProdajaSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Artikal ili količina prodaje nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ prodaja: await demoMeatSale({
        stockId: rezultat.data.zalihaId,
        quantity: rezultat.data.kolicina,
      }) }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Prodaja mesa nije uspjela." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("prodaj_artikal_mesnice", {
    p_zaliha_id: rezultat.data.zalihaId,
    p_kolicina: rezultat.data.kolicina,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Prodaja mesnice nije uspjela:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ prodaja: data }, { status: 201 });
}
