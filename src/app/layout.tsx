import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { ForbiddenProvider } from "@/lib/forbidden-context";
import { CajaProvider } from "@/lib/caja-context";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farmacia POS - Punto de Venta",
  description: "Sistema de punto de venta para farmacia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex h-screen flex-col overflow-hidden antialiased`}
      >
        <ForbiddenProvider>
          <CajaProvider>
            <Navbar />
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
            <Toaster position="bottom-right" richColors />
          </CajaProvider>
        </ForbiddenProvider>
      </body>
    </html>
  );
}
