import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { ToastViewport } from "@/components/toast-viewport";
export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.tagline,
  icons: { icon: BRAND.logo },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
