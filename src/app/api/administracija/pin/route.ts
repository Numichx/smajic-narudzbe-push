import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoChangePin } from "@/lib/demo/store";

const PinSchema = z.object({
  vrsta: z.enum(["osoblje", "sefica", "poseban_prilog"]),
  pin: z.string().regex(/^\d{4,8}$/),
});

export async function POST(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može mijenjati PIN-ove." }, { status: 403 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = PinSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "PIN mora imati 4 do 8 cifara." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      await demoChangePin(rezultat.data.vrsta, rezultat.data.pin);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Promjena probnog PIN-a nije uspjela:", error);
      return NextResponse.json({ greska: "Probni PIN nije moguće sačuvati." }, { status: 500 });
    }
  }
  const { error } = await supabase.rpc("postavi_pin", {
    p_kljuc: rezultat.data.vrsta,
    p_pin: rezultat.data.pin,
  });
  if (error) {
    console.error("Promjena PIN-a nije uspjela:", error);
    return NextResponse.json({ greska: "PIN nije moguće sačuvati." }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
