import { Search } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { MetenLogo } from "@/components/brand/meten-logo";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";

export async function TopBar() {
  const session = await getSessionContext();

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-background px-4 md:px-6">
      <MetenLogo className="md:hidden" />
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search leads or students"
          aria-label="Search leads or students"
        />
      </div>
      <div className="ml-4 flex items-center gap-2">
        <div className="hidden h-9 items-center rounded-md border px-3 text-sm font-medium sm:flex">
          {session.name}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="h-9 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}
