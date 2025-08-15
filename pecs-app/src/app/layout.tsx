import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { SessionSync } from "@/components/auth/SessionSync";
import { Header } from "@/components/Header";
import { LocaleProvider } from "@/contexts/LocaleContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PECS Card Builder",
  description: "Build and print PECS communication cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body className={inter.className}>
        <SessionProvider>
          <LocaleProvider>
            <SessionSync />
            <div className="min-h-screen bg-gray-950 text-gray-100">
              <Header />
              <main className="mx-auto max-w-7xl p-4">{children}</main>
            </div>
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}