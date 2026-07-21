import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meten",
  description: "Academy CRM for sports academies"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
