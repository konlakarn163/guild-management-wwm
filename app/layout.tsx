import { Bebas_Neue, IBM_Plex_Sans_Thai, Kalam } from "next/font/google";
import { SiteFooter } from "@/components/public/site-footer";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

const display = Bebas_Neue({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const body = IBM_Plex_Sans_Thai({ variable: "--font-body", subsets: ["latin", "thai"], weight: ["400", "500", "700"] });
const script = Kalam({ variable: "--font-script", subsets: ["latin"], weight: ["400", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${display.variable} ${body.variable} ${script.variable} antialiased`}>
      <body>
        <LanguageProvider>
          {children}
          <ToastContainer
            position="top-center"
            autoClose={2800}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            theme="dark"
          />
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}