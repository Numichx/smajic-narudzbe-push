import { RoleNavigation } from "@/components/RoleNavigation";

export default function SankLayout({ children }: LayoutProps<"/sank">) {
  return (
    <div className="role-shell">
      {children}
      <RoleNavigation role="sank" />
    </div>
  );
}
