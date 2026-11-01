import { cookies } from "next/headers";
import { zaposlenikJeAktivan } from "./aktivnostZaposlenika";
import { procitajTokenSesije } from "./sessionToken";

export async function procitajZahtjevSesiju() {
  const cookieStore = await cookies();
  const sesija = procitajTokenSesije(cookieStore.get("sesija")?.value);
  if (!sesija) return null;

  // Deaktivirani zaposlenik ne može nastaviti raditi sa starom sesijom.
  if (sesija.licni && !(await zaposlenikJeAktivan(sesija.id))) return null;

  return sesija;
}
