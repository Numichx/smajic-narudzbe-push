import { AppShell } from "@/components/AppShell";

export default function SeficaLayout({ children }: LayoutProps<"/sefica">) {
  return <AppShell uloga="sefica">{children}</AppShell>;
}
