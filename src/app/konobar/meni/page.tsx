import { redirect } from "next/navigation";

// Meni se otvara iz odabranog stola.
export default function MeniPage() {
  redirect("/konobar/stolovi");
}
