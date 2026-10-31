import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoBarRefill } from "@/lib/demo/store";

const DopunaSchema = z.object({
  proizvodId: z.string().uuid(),
  kolicina: z.number().positive().max(10000),
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sank") {
    return NextResponse.json({ greska: "Samo šank može evidentirati dopunu." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = DopunaSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Artikal ili količina dopune nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const dopunaId = await demoBarRefill({
        productId: rezultat.data.proizvodId,
        quantity: rezultat.data.kolicina,
      });
      return NextResponse.json({ dopunaId }, { status: 201 });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Dopuna nije evidentirana." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("evidentiraj_dopunu_sanka", {
    p_proizvod_id: rezultat.data.proizvodId,
    p_kolicina: rezultat.data.kolicina,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Evidencija dopune šanka nije uspjela:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ dopunaId: data }, { status: 201 });
}
