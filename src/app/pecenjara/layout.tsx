import { AppShell } from "@/components/AppShell";

export default function PecenjaraLayout({ children }: LayoutProps<"/pecenjara">) {
  return <AppShell uloga="pecenjara">{children}</AppShell>;
}
