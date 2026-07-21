import { MobileBottomNav } from "@/components/app-shell/mobile-bottom-nav";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { TopBar } from "@/components/app-shell/top-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
