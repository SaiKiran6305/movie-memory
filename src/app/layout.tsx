import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Movie Memory — A little more movie magic",
  description:
    "Keep your favorite film close. Discover something new about it.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
