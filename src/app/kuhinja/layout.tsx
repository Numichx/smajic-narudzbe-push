import { RoleNavigation } from "@/components/RoleNavigation";

export default function KuhinjaLayout({ children }: LayoutProps<"/kuhinja">) {
  return (
    <div className="role-shell">
      {children}
      <RoleNavigation role="kuhinja" />
    </div>
  );
}
