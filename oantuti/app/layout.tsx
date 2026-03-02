import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cartoon RPS Arena",
  description: "Prototype: play rock-paper-scissors against a cartoon image using webcam hand tracking.",
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
