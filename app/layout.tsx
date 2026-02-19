import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from './context/CartContext';
import QueryProvider from './providers/QueryProvider';
import { Suspense } from 'react';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import ErudaDebug from '@/components/ErudaDebug';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Indie's Café Menu and Order Tracker",
  description: "Menu digital pour Indie's - Commander et payer avec Innopay",
  icons: {
    icon: '/favicon-32x32.png',
    apple: '/images/innopay-blue.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Indies Menu",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegistration />
        <ErudaDebug />
        <QueryProvider>
          <Suspense fallback={<div>Loading application...</div>}>
            <CartProvider>
              {children}
            </CartProvider>
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
