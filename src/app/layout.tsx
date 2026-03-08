import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Auth0Provider } from '@auth0/nextjs-auth0/client';
import { DashboardProvider } from "@/context/DashboardContext";
import ToastContainer from "@/components/Toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArtiCue - Speech Therapy for Canadian Children",
  description: "Speech therapy for every Canadian child — no waitlist required.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Auth0Provider>
          <DashboardProvider>
            {children}
            <ToastContainer />
          </DashboardProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
