import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Martian_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Martian Mono over JetBrains Mono deliberately — it reads as a receipt rather
// than as code.
const martian = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Makemycake — build your cake and watch it appear",
  description:
    "Design a cake in 3D, see the price itemised as you build, and get an order docket a real bakery can work from. Hyderabad.",
  openGraph: {
    title: "Makemycake",
    description: "Build your own cake in 3D. Itemised pricing, no surprises.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#E8E6E1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${bricolage.variable} ${inter.variable} ${martian.variable}`}>
      <body className="min-h-dvh bg-slab text-ink antialiased">{children}</body>
    </html>
  );
}
