import { ObavijestiKonobara } from "@/components/ObavijestiKonobara";
import { RoleNavigation } from "@/components/RoleNavigation";

export default function KonobarLayout({ children }: LayoutProps<"/konobar">) {
  return (
    <div className="role-shell">
      {children}
      <ObavijestiKonobara />
      <RoleNavigation role="konobar" />
    </div>
  );
}
