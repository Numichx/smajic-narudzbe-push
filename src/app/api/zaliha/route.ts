import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoInventory, demoUpdateInventory } from "@/lib/demo/store";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || !["mesnica", "sefica"].includes(sesija.uloga)) {
    return NextResponse.json({ greska: "Nemate pravo pregleda zaliha." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoInventory());
    } catch (error) {
      console.error("Učitavanje probne zalihe nije uspjelo:", error);
      return NextResponse.json({ greska: "Probnu zalihu nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("zaliha_artikli")
    .select("id, naziv, jedinica, stanje, minimum, nabavna_cijena, prodajna_cijena, aktivan")
    .eq("aktivan", true)
    .order("naziv");
  if (error) {
    console.error("Učitavanje zaliha nije uspjelo:", error);
    return NextResponse.json({ greska: "Zalihe nije moguće učitati." }, { status: 500 });
  }
  return NextResponse.json({ zaliha: data });
}

export async function PATCH(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return NextResponse.json({ greska: "Samo šefica može mijenjati zalihe i cijene." }, { status: 403 });
  }
  const schema = z.object({
    id: z.string().uuid(),
    minimum: z.number().nonnegative().optional(),
    nabavnaCijena: z.number().nonnegative().nullable().optional(),
    prodajnaCijena: z.number().nonnegative().nullable().optional(),
  }).refine((value) =>
    value.minimum !== undefined ||
    value.nabavnaCijena !== undefined ||
    value.prodajnaCijena !== undefined,
  );
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = schema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Promjena zalihe nije ispravna." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      await demoUpdateInventory({
        id: rezultat.data.id,
        minimum: rezultat.data.minimum,
        nabavnaCijena: rezultat.data.nabavnaCijena,
        prodajnaCijena: rezultat.data.prodajnaCijena,
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Artikal nije moguće izmijeniti." }, { status: 422 });
    }
  }

  const promjena: {
    minimum?: number;
    nabavna_cijena?: number | null;
    prodajna_cijena?: number | null;
  } = {};
  if (rezultat.data.minimum !== undefined) promjena.minimum = rezultat.data.minimum;
  if (rezultat.data.nabavnaCijena !== undefined) {
    promjena.nabavna_cijena = rezultat.data.nabavnaCijena;
  }
  if (rezultat.data.prodajnaCijena !== undefined) {
    promjena.prodajna_cijena = rezultat.data.prodajnaCijena;
  }
  const { data, error } = await supabase
    .from("zaliha_artikli")
    .update(promjena)
    .eq("id", rezultat.data.id)
    .select("id");
  if (error) {
    console.error("Izmjena artikla zalihe nije uspjela:", error);
    return NextResponse.json({ greska: "Artikal nije moguće izmijeniti." }, { status: 422 });
  }
  if (data.length === 0) {
    return NextResponse.json({ greska: "Artikal zalihe nije pronađen." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
