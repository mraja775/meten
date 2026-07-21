import { requestOwnerOtpAction } from "@/app/(auth)/actions";
import { MetenLogo } from "@/components/brand/meten-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 py-5 text-center">
          <MetenLogo className="h-12 w-36" />
          <div className="space-y-1">
            <CardTitle>Sign in to Meten</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your owner email to receive a login code.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form action={requestOwnerOtpAction} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Owner email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="owner@academy.com"
                defaultValue={params.email ?? ""}
                autoComplete="email"
                required
              />
            </div>
            {params.error === "email-required" ? (
              <p className="text-sm text-destructive">Enter your academy owner email.</p>
            ) : null}
            {params.sent ? (
              <p className="text-sm text-muted-foreground">
                If this owner email exists, an OTP has been sent.
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Send OTP
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
