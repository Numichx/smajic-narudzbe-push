import { AppShell } from "@/components/AppShell";

export default function SankLayout({ children }: LayoutProps<"/sank">) {
  return <AppShell uloga="sank">{children}</AppShell>;
}
