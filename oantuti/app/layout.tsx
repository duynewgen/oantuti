import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oantuti - Rock, Paper, Scissors",
  description: "Play rock-paper-scissors against your favorite cartoon character!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
