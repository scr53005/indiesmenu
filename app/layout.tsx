import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from './context/CartContext'; // Import your CartProvider
import { Suspense } from 'react'; // <--- NEW: Import Suspense from React

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
  description: "Created by Innopay and OffChain Luxembourg",
  icons: {
    icon: '/favicon-32x32.png', // Path to your favicon, relative to 'public' folder
    // You can add more sizes/types if needed, e.g., for apple-touch-icon
    // apple: '/apple-touch-icon.png',
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
        <Suspense fallback={<div>Loading application...</div>}>
        <CartProvider>
          {children}
        </CartProvider>
       </Suspense> 
      </body>
    </html>
  );
}
