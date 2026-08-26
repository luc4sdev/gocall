import type { Metadata, Viewport } from "next";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";

import { Inter } from "next/font/google";
import { ToastContainer } from "react-toastify";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoCall | Converse com amigos",
  description: "Plataforma de voz e vídeo em tempo real",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=localStorage.getItem('gocall:accentColor');if(c)document.documentElement.style.setProperty('--brand',c);}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col bg-[#313338] text-gray-100 overflow-hidden`}>
        {children}
        <ToastContainer theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}