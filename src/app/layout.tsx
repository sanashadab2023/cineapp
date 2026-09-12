import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClientMockProvider from "@/components/ClientMockProvider";

export const metadata: Metadata = {
  title: "CineBook - Premium Cinema Ticket Booking",
  description:
    "Experience the future of cinema reservations. Book luxury IMAX, 3D, and Dolby Atmos seats with real-time seat locks and instant digital QR passes.",
  keywords: ["cinema", "movie tickets", "IMAX", "Dolby Atmos", "CineBook", "seat booking"],
  authors: [{ name: "CineBook Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-cinema-950 text-cinema-100 flex flex-col antialiased">
        <ClientMockProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ClientMockProvider>
      </body>
    </html>
  );
}
