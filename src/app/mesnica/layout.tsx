import { RoleNavigation } from "@/components/RoleNavigation";

export default function MesnicaLayout({ children }: LayoutProps<"/mesnica">) {
  return (
    <div className="role-shell">
      {children}
      <RoleNavigation role="mesnica" />
    </div>
  );
}
