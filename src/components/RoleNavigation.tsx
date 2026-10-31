"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";

type Role = "konobar" | "kuhinja" | "pecenjara" | "sank" | "mesnica" | "sefica";
type IconName = "table" | "menu" | "receipt" | "more" | "orders" | "shift" | "stock" | "report" | "admin";

const NAVIGATION: Record<Role, { href: string; label: string; icon: IconName }[]> = {
  konobar: [
    { href: "/konobar/stolovi", label: "Stolovi", icon: "table" },
    { href: "/konobar/meni", label: "Meni", icon: "menu" },
    { href: "/konobar/racuni", label: "Računi", icon: "receipt" },
    { href: "/konobar/rezervacije", label: "Više", icon: "more" },
  ],
  kuhinja: [
    { href: "/kuhinja", label: "Narudžbe", icon: "orders" },
    { href: "/kuhinja#zbirno", label: "Zbirno", icon: "menu" },
    { href: "/kuhinja#zahtjevi", label: "Mesnica", icon: "stock" },
    { href: "/", label: "Početna", icon: "more" },
  ],
  pecenjara: [
    { href: "/pecenjara", label: "Narudžbe", icon: "orders" },
    { href: "/pecenjara#smjena", label: "Smjena", icon: "shift" },
    { href: "/pecenjara#dug", label: "Dug", icon: "receipt" },
    { href: "/", label: "Početna", icon: "more" },
  ],
  sank: [
    { href: "/sank", label: "Narudžbe", icon: "orders" },
    { href: "/sank#smjena", label: "Smjena", icon: "shift" },
    { href: "/sank#dopune", label: "Dopune", icon: "stock" },
    { href: "/", label: "Početna", icon: "more" },
  ],
  mesnica: [
    { href: "/mesnica", label: "Zahtjevi", icon: "orders" },
    { href: "/mesnica#stanje", label: "Stanje", icon: "stock" },
    { href: "/mesnica#prodaja", label: "Prodaja", icon: "receipt" },
    { href: "/", label: "Početna", icon: "more" },
  ],
  sefica: [
    { href: "/sefica/izvjestaj", label: "Izvještaj", icon: "report" },
    { href: "/sefica/zaliha", label: "Zaliha", icon: "stock" },
    { href: "/sefica/administracija", label: "Admin", icon: "admin" },
    { href: "/sefica", label: "Više", icon: "more" },
  ],
};

function NavigationIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    table: <><path d="M4 9h16v3H4z" /><path d="M6 12v8m12-8v8M4 20h16" /></>,
    menu: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6m-6 4h6m-6 4h3" /></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6m-6 4h6m-6 4h4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    orders: <><path d="M5 5h14v4H5zm0 7h14v7H5z" /><path d="M8 14h5m-5 3h8" /></>,
    shift: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    stock: <><path d="m12 3 9 5-9 5-9-5z" /><path d="M3 8v9l9 5 9-5V8m-9 5v9" /></>,
    report: <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2" /></>,
    admin: <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function RoleNavigation({ role }: { role: Role }) {
  return (
    <Suspense fallback={<NavigationLinks role={role} />}>
      <ActiveNavigation role={role} />
    </Suspense>
  );
}

function NavigationLinks({ role, pathname }: { role: Role; pathname?: string }) {
  const links = NAVIGATION[role].map(({ href, label, icon }) => {
    const target = href.split("#")[0];
    const active = pathname !== undefined &&
      (pathname === target || (target !== "/" && pathname.startsWith(`${target}/`)));

    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`role-nav-link${active ? " is-active" : ""}`}
      >
        <NavigationIcon name={icon} />
        <span>{label}</span>
      </Link>
    );
  });

  return <nav className="role-navigation" aria-label="Glavna navigacija">{links}</nav>;
}

function ActiveNavigation({ role }: { role: Role }) {
  const pathname = usePathname();
  return <NavigationLinks role={role} pathname={pathname} />;
}
