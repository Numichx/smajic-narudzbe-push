import { AppShell } from "@/components/AppShell";
import { ObavijestiKonobara } from "@/components/ObavijestiKonobara";

export default function KonobarLayout({ children }: LayoutProps<"/konobar">) {
  return (
    <AppShell uloga="konobar">
      {children}
      <ObavijestiKonobara />
    </AppShell>
  );
}
