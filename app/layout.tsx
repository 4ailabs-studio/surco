import type { Metadata } from "next";
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const titulo = Bricolage_Grotesque({ variable: "--font-titulo", subsets: ["latin"], weight: ["500", "700", "800"] });
const texto = Atkinson_Hyperlegible({ variable: "--font-texto", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Surco",
  description: "Prepara tu solicitud de crédito de avío y llévate una hoja lista para tu CADER o tu intermediario.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${titulo.variable} ${texto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
