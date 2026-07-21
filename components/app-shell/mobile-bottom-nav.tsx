"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

const mobileItems = navItems.filter((item) =>
  ["/dashboard", "/students", "/training", "/payments"].includes(item.href)
);

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-lg backdrop-blur md:hidden"
      aria-label="Mobile primary"
    >
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-medium text-muted-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
