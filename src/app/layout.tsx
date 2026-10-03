import type { Metadata, Viewport } from "next";
import { Geist_Mono, Lato, Ubuntu } from "next/font/google";
import "./globals.css";

// Lato is the official typeface for City of Kraków texts; Ubuntu Medium is used in the city logotype.
const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700", "900"],
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "QuickReport",
  description: "Zgłoszenia miejskie jednym zdjęciem, wspierane przez AI.",
  appleWebApp: { capable: true, title: "QuickReport", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${lato.variable} ${ubuntu.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
