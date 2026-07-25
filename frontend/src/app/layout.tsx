import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoMint",
  description: "Mint, earn, and trade AI bot NFTs on Stellar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
