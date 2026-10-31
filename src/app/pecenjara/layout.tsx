import { RoleNavigation } from "@/components/RoleNavigation";

export default function PecenjaraLayout({ children }: LayoutProps<"/pecenjara">) {
  return (
    <div className="role-shell">
      {children}
      <RoleNavigation role="pecenjara" />
    </div>
  );
}
