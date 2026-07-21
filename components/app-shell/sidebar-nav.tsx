import Link from "next/link";
import { MetenLogo } from "@/components/brand/meten-logo";
import { navItems } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

export function SidebarNav() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:block">
      <div className="flex h-16 items-center border-b px-6">
        <MetenLogo />
      </div>
      <nav className="space-y-1 p-3" aria-label="Primary">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
