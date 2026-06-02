"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, FileSpreadsheet, Handshake, LogOut, PackageSearch, ReceiptText, Wrench } from "lucide-react";

const nav = [
  { href: "/", label: "Import", icon: FileSpreadsheet },
  { href: "/po", label: "PO Search", icon: ReceiptText },
  { href: "/wo", label: "WO Search", icon: Wrench },
  { href: "/suppliers", label: "Suppliers", icon: Handshake },
  { href: "/price-reference", label: "Price Ref", icon: PackageSearch }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <main className="main login-main">{children}</main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Database size={22} />
          <div>
            <strong>Mango Procurement</strong>
            <span>Search Database</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <form className="logout-form" action="/api/auth/logout" method="post">
          <button type="submit">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
