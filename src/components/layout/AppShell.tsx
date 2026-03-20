"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const noShellPaths = ["/login", "/scanner"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNoShell = noShellPaths.some((p) => pathname.startsWith(p));

  if (isNoShell) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
