import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans-family",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif-family",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI Clip Finder",
  description: "Turn long-form videos into viral clips automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white font-sans text-[#1A1A1A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
