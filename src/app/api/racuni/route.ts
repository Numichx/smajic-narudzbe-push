import { NextResponse } from "next/server";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoOpenBills } from "@/lib/demo/store";
import { racunSpremanZaNaplatu } from "@/lib/domain/racun";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Pregled računa dostupan je samo konobarima." }, { status: 403 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json(await demoOpenBills());
    } catch (error) {
      console.error("Učitavanje probnih računa nije uspjelo:", error);
      return NextResponse.json({ greska: "Probne račune nije moguće učitati." }, { status: 500 });
    }
  }
  const { data, error } = await supabase
    .from("racuni")
    .select("id, broj, sto_id, konobar_ime, otvoren_at, podijeljeno_na, narudzbe(status, stavke_narudzbe(kolicina, cijena, prilozi, stornirano)), stolovi:racun_stolovi(stolovi(id, naziv))")
    .eq("status", "otvoren")
    .order("otvoren_at", { ascending: true });
  if (error) {
    console.error("Učitavanje računa nije uspjelo:", error);
    return NextResponse.json({ greska: "Račune nije moguće učitati." }, { status: 500 });
  }
  const racuni = data.map((racun) => {
    const stavke = racun.narudzbe.flatMap((narudzba) => narudzba.stavke_narudzbe);
    const ukupno = stavke.reduce((suma, stavka) => {
      if (stavka.stornirano) return suma;
      const prilozi = Array.isArray(stavka.prilozi)
        ? stavka.prilozi.reduce((zbir, prilog) => {
            const cijena = Number((prilog as { cijena?: unknown }).cijena);
            return zbir + (Number.isFinite(cijena) ? cijena : 0);
          }, 0)
        : 0;
      return suma + Number(stavka.cijena) * Number(stavka.kolicina) + prilozi;
    }, 0);
    return {
      id: racun.id,
      broj: racun.broj,
      stoId: racun.sto_id,
      stolovi: racun.stolovi.flatMap((veza) => veza.stolovi ?? []),
      konobar: racun.konobar_ime,
      otvorenAt: racun.otvoren_at,
      minute: Math.max(0, Math.floor((Date.now() - new Date(racun.otvoren_at).getTime()) / 60_000)),
      ukupno: Math.round((ukupno + Number.EPSILON) * 100) / 100,
      podijeljenoNa: racun.podijeljeno_na,
      cekaNaplatu: racunSpremanZaNaplatu(racun.narudzbe),
    };
  });
  return NextResponse.json({ racuni });
}
