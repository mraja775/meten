import Link from "next/link";
import { verifyOwnerOtpAction } from "@/app/(auth)/actions";
import { MetenLogo } from "@/components/brand/meten-logo";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function errorMessage(error?: string) {
  switch (error) {
    case "expired":
      return "This OTP has expired. Request a new one.";
    case "too-many-attempts":
      return "Too many attempts. Request a new OTP.";
    case "invalid-code":
      return "Enter the 6-digit OTP from your email.";
    default:
      return null;
  }
}

export default async function VerifyOtpPage({
  searchParams
}: {
  searchParams: Promise<{
    email?: string;
    error?: string;
    sent?: string;
    delivery?: string;
    cooldown?: string;
  }>;
}) {
  const params = await searchParams;
  const message = errorMessage(params.error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 py-5 text-center">
          <MetenLogo className="h-12 w-36" />
          <div className="space-y-1">
            <CardTitle>Enter OTP</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use the 6-digit code sent to your owner account.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={verifyOwnerOtpAction} className="space-y-3">
            <input type="hidden" name="email" value={params.email ?? ""} />
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="code">
                6-digit code
              </label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                autoComplete="one-time-code"
                required
              />
            </div>
            {params.sent ? (
              <p className="text-sm text-muted-foreground">
                {params.delivery === "console"
                  ? "Local development mode: the OTP was printed in the server console."
                  : `OTP sent to ${params.email}.`}
              </p>
            ) : null}
            {params.cooldown ? (
              <p className="text-sm text-muted-foreground">
                A code was just sent. Please wait before requesting another.
              </p>
            ) : null}
            {message ? <p className="text-sm text-destructive">{message}</p> : null}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
          <Link
            href="/sign-in"
            className={buttonClassName({ variant: "ghost", className: "w-full" })}
          >
            Use another email
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
