import { AppShell } from "@/components/AppShell";

export default function MesnicaLayout({ children }: LayoutProps<"/mesnica">) {
  return <AppShell uloga="mesnica">{children}</AppShell>;
}
