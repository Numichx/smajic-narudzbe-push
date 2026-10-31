import { RoleNavigation } from "@/components/RoleNavigation";

export default function SeficaLayout({ children }: LayoutProps<"/sefica">) {
  return (
    <div className="role-shell">
      {children}
      <RoleNavigation role="sefica" />
    </div>
  );
}
