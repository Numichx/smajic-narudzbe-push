import { cookies } from "next/headers";
import { procitajTokenSesije } from "./sessionToken";

export async function procitajZahtjevSesiju() {
  const cookieStore = await cookies();
  return procitajTokenSesije(cookieStore.get("sesija")?.value);
}
