import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoSetOrderStatus } from "@/lib/demo/store";

const StatusSchema = z.object({
  status: z.enum(["U pripremi", "Gotovo", "Izdato"]),
  cijenaPecenjari: z.number().nonnegative().optional(),
  // Stavka ne može imati 0 kg (ograničenje u bazi); neizdata jagnjetina se stornira.
  jagnjetinaKg: z.number().positive().max(9999).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija || (sesija.uloga !== "kuhinja" && sesija.uloga !== "pecenjara" && sesija.uloga !== "sank")) {
    return NextResponse.json(
      { greska: "Pristup je dozvoljen samo stanicama." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { greska: "Neispravan identifikator narudžbe." },
      { status: 400 },
    );
  }

  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = StatusSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json(
      { greska: "Neispravan status narudžbe." },
      { status: 400 },
    );
  }
  if (
    sesija.uloga === "pecenjara" &&
    rezultat.data.status === "Gotovo" &&
    rezultat.data.cijenaPecenjari === undefined
  ) {
    return NextResponse.json({ greska: "Unesite cijenu koju konobar plaća pečenjari." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const narudzba = await demoSetOrderStatus({
        orderId: id,
        station: sesija.uloga,
        status: rezultat.data.status,
        actor: sesija.ime,
        cost: rezultat.data.cijenaPecenjari,
        lambKg: rezultat.data.jagnjetinaKg,
      });
      return NextResponse.json({ narudzba });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Status narudžbe nije moguće promijeniti." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("promijeni_status_narudzbe", {
    p_narudzba_id: id,
    p_uloga: sesija.uloga,
    p_novi_status: rezultat.data.status,
    p_cijena_pecenjari: rezultat.data.cijenaPecenjari ?? null,
    p_akter_ime: sesija.ime,
    p_jagnjetina_kg: rezultat.data.jagnjetinaKg ?? null,
  });

  if (error) {
    console.error("Promjena statusa narudžbe nije uspjela:", error);
    return NextResponse.json(
      { greska: error.message },
      { status: 422 },
    );
  }

  return NextResponse.json({ narudzba: data });
}
