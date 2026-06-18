import type { Metadata } from "next";
import {
  Playfair_Display,
  Libre_Baskerville,
  Oswald,
  Special_Elite,
} from "next/font/google";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-head",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-deck",
  weight: ["400", "600", "700"],
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  variable: "--font-stamp",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "The News Distiller",
  description:
    "La verità in tutte le sue contraddizioni — ogni giorno, senza filtri",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="it"
      className={cn(
        playfair.variable,
        baskerville.variable,
        oswald.variable,
        specialElite.variable
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
