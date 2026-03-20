"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ship,
  Truck,
  FileCheck,
  Plug,
  FileText,
  ClipboardCheck,
  Package,
  MapPin,
  ScanBarcode,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Shipments", href: "/shipments", icon: Package, theme: "shipments" },
  { label: "Vessels", href: "/vessels", icon: Ship, theme: "default" },
  { label: "Dispatch", href: "/dispatch", icon: Truck, theme: "default" },
  { label: "Customs", href: "/customs", icon: FileCheck, theme: "customs" },
  { label: "Integrations", href: "/integrations", icon: Plug, theme: "default" },
  { label: "Documents", href: "/documents", icon: FileText, theme: "default" },
  { label: "Quality", href: "/quality", icon: ClipboardCheck, theme: "quality" },
  { label: "Transport", href: "/transport", icon: MapPin, theme: "transport" },
  { label: "Scanner", href: "/scanner", icon: ScanBarcode, theme: "quality" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card" role="navigation" aria-label="Main navigation">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2D6A4F]">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="text-lg font-bold tracking-tight">Meridian</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive && "bg-accent text-accent-foreground font-semibold"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
