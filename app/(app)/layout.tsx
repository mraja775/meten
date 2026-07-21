import { AppShell } from "@/components/app-shell/app-shell";

export default function ProtectedAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
