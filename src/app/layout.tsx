import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRP TV Kiosk",
  description: "YouTube kiosk wrapper for WIP-Dark-RP televisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
