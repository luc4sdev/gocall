import type { Metadata } from "next";
import "./globals.css";

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoCall | Onde as conversas acontecem",
  description: "Plataforma de voz e vídeo em tempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#313338] text-gray-100 overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}