import { updateSettingsAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSessionContext();
  const academy = await prisma.academy.findFirstOrThrow({
    where: {
      id: session.academyId,
      deletedAt: null
    }
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage academy profile details used across the CRM.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academy Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateSettingsAction} className="grid gap-4">
            <Input name="name" defaultValue={academy.name} aria-label="Academy name" required />
            <Input name="logoUrl" defaultValue={academy.logoUrl ?? ""} aria-label="Logo URL" placeholder="Logo URL" />
            <Input name="phone" defaultValue={academy.phone ?? ""} aria-label="Academy phone" />
            <Input name="email" defaultValue={academy.email ?? ""} aria-label="Academy email" />
            <textarea
              name="address"
              className="min-h-24 rounded-md border bg-background p-3 text-sm"
              defaultValue={academy.address ?? ""}
              aria-label="Academy address"
            />
            <Input name="businessHours" defaultValue={academy.businessHours ?? ""} aria-label="Business hours" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="brandPrimaryColor" defaultValue={academy.brandPrimaryColor} aria-label="Primary brand color" required />
              <Input name="brandSecondaryColor" defaultValue={academy.brandSecondaryColor} aria-label="Secondary brand color" required />
            </div>
            <div>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
