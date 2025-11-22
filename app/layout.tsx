import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoReach",
  description: "Next.js AutoReach with Better Auth",
  icons: {
    icon: "/favicon.ico", 
  },
};

import { FeedbackButton } from "@/components/feedback-button";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="flex flex-col">
            <Navbar />
            <main className="">
              {children}
            </main>
            <Footer />
          </div>
          <FeedbackButton />
        </Providers>
      </body>
    </html>
  );
}
