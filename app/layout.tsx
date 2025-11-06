import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Constraint Satisfaction Solver",
  description: "Optimize resource allocation using linear programming",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster duration={1500} />
        <Analytics />
      </body>
    </html>
  );
}
