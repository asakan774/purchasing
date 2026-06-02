import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mango Procurement Search",
  description: "PO, WO, supplier, and price-reference search for Mango ERP exports."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
