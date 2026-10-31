import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoReport } from "@/lib/demo/store";

function csvVrijednost(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "sefica") {
    return Response.json({ greska: "Samo šefica može izvesti izvještaj." }, { status: 403 });
  }
  const dani = new URL(request.url).searchParams.get("dani") ?? "1";
  if (!["1", "7", "30"].includes(dani)) {
    return Response.json({ greska: "Period može biti 1, 7 ili 30 dana." }, { status: 400 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      const report = await demoReport(Number(dani));
      const rows = [
        ["Vrsta", "Naziv", "Iznos", "Broj/količina"],
        ["Sažetak", "Naplaceno", report.naplaceno, report.racuni],
        ["Sažetak", "Naručeno", report.naruceno, ""],
        ["Sažetak", "Dug", report.dug, ""],
        ["Sažetak", "Bakšiš", report.baksis, ""],
        ["Sažetak", "Otvoreni računi sada", report.otvoreni_racuni, ""],
        ...report.po_konobaru.map((row) => ["Konobar", row.ime, row.naplaceno, row.broj_racuna]),
        ...report.po_proizvodu.map((row) => ["Proizvod", row.naziv, row.promet, row.kolicina]),
      ];
      const content = `\uFEFF${rows.map((row) => row.map(csvVrijednost).join(";")).join("\r\n")}`;
      return new Response(content, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="izvjestaj-${dani}-dana.csv"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("Izvoz probnog CSV izvještaja nije uspio:", error);
      return Response.json({ greska: "Probni izvještaj nije moguće izvesti." }, { status: 500 });
    }
  }
  const doDatuma = new Date();
  const odDatuma = new Date(doDatuma);
  odDatuma.setDate(odDatuma.getDate() - Number(dani));
  const { data, error } = await supabase.rpc("izvjestaj_period", {
    p_od: odDatuma.toISOString(),
    p_do: doDatuma.toISOString(),
  });
  if (error) {
    console.error("CSV izvještaj nije moguće izračunati:", error);
    return Response.json({ greska: "Izvještaj nije moguće izvesti." }, { status: 500 });
  }

  const izvjestaj = data as {
    naplaceno: number;
    dug: number;
    racuni: number;
    baksis: number;
    otvoreni_racuni: number;
    po_konobaru: { ime: string; naplaceno: number; baksis: number; broj_racuna: number }[];
    po_proizvodu: { naziv: string; kolicina: number; promet: number }[];
  };
  const rows = [
    ["Vrsta", "Naziv", "Iznos", "Broj/količina"],
    ["Sažetak", "Naplaceno", izvjestaj.naplaceno, izvjestaj.racuni],
    ["Sažetak", "Dug", izvjestaj.dug, ""],
    ["Sažetak", "Bakšiš", izvjestaj.baksis, ""],
    ["Sažetak", "Otvoreni računi sada", izvjestaj.otvoreni_racuni, ""],
    ...izvjestaj.po_konobaru.map((row) => ["Konobar", row.ime, row.naplaceno, row.broj_racuna]),
    ...izvjestaj.po_proizvodu.map((row) => ["Proizvod", row.naziv, row.promet, row.kolicina]),
  ];
  const content = `\uFEFF${rows.map((row) => row.map(csvVrijednost).join(";")).join("\r\n")}`;
  return new Response(content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="izvjestaj-${dani}-dana.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
