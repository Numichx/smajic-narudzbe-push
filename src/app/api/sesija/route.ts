import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";

export async function GET() {
  const sesija = await procitajZahtjevSesiju();
  if (!sesija) {
    return NextResponse.json({ greska: "Niste prijavljeni." }, { status: 401 });
  }
  return NextResponse.json({ ime: sesija.ime, uloga: sesija.uloga });
}

/** Odjava: briše potpisanu sesiju s ovog uređaja. */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("sesija");
  return NextResponse.json({ ok: true });
}
