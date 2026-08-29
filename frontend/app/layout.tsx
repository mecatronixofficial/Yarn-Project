import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "YarnFlow ERP",
  description: "Yarn production, knitting, dyeing and delivery ERP",
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
