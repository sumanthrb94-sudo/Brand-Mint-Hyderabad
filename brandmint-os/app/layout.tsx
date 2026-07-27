import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Mint OS",
  description: "Client portal and studio dashboard for Brand Mint Studios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
