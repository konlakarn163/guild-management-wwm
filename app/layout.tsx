import { Bebas_Neue, IBM_Plex_Sans_Thai, Kalam } from "next/font/google";
import { SiteFooter } from "@/components/public/site-footer";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://guild-management-wwm.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MeawMeaw Guild | Where Winds Meet Thailand",
  description: "MeawMeaw Guild | Where Winds Meet Thailand - Your all-in-one platform for managing your guild's operations, strategies, and member engagement in the world of Where Winds Meet. Streamline your guild management with our intuitive dashboard, comprehensive tools, and real-time updates. Join us to elevate your guild's performance and foster a thriving community in Where Winds Meet Thailand. ",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MeawMeaw Guild",
    title: "MeawMeaw Guild | Where Winds Meet Thailand",
    description:
      "MeawMeaw Guild | Where Winds Meet Thailand - Your all-in-one platform for managing your guild's operations, strategies, and member engagement in the world of Where Winds Meet.",
    images: [
      {
        url: "/images/meta.webp",
        width: 1200,
        height: 630,
        alt: "MeawMeaw Guild",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MeawMeaw Guild | Where Winds Meet Thailand",
    description:
      "MeawMeaw Guild | Where Winds Meet Thailand - Your all-in-one platform for managing your guild's operations, strategies, and member engagement in the world of Where Winds Meet.",
    images: ["/images/meta.webp"],
  },
};
const display = Bebas_Neue({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = IBM_Plex_Sans_Thai({ variable: "--font-body", subsets: ["latin", "thai"], weight: ["400", "500", "700"] });
const script = Kalam({ variable: "--font-script", subsets: ["latin"], weight: ["400", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${display.variable} ${body.variable} ${script.variable} antialiased`}>
      <body>
        <LanguageProvider>
          {children}
          <ToastProvider />
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}