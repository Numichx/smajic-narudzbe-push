import { AppShell } from "@/components/AppShell";

export default function KuhinjaLayout({ children }: LayoutProps<"/kuhinja">) {
  return <AppShell uloga="kuhinja">{children}</AppShell>;
}
