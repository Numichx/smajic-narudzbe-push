import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoInventoryChange } from "@/lib/demo/store";

const PrometSchema = z.object({
  zalihaId: z.string().uuid(),
  promjena: z.number().refine((value) => value !== 0),
  razlog: z.string().trim().min(3).max(200),
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  // Mesnica vodi stanje robe pa smije evidentirati popis, prijem, višak ili otpis.
  if (!sesija || !["sefica", "mesnica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Samo šefica ili mesnica mogu mijenjati stanje zalihe." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = PrometSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Artikal, promjena i razlog nisu ispravni." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ rezultat: await demoInventoryChange({
        id: rezultat.data.zalihaId,
        delta: rezultat.data.promjena,
        reason: rezultat.data.razlog,
        actor: sesija.ime,
      }) });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Promjena zalihe nije uspjela." }, { status: 422 });
    }
  }
  const { data, error } = await supabase.rpc("evidentiraj_promjenu_zalihe", {
    p_zaliha_id: rezultat.data.zalihaId,
    p_promjena: rezultat.data.promjena,
    p_razlog: rezultat.data.razlog,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Promjena zalihe nije uspjela:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ rezultat: data });
}
