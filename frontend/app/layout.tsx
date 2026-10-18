import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css";
import StoreProvider from "./StoreProvider";
import AuthWrapper from "@/components/AuthWrapper";
import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "IRAG",
  description: "Your friendly AI assistant",
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IRAG",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/IRAG logos.png", sizes: "192x192", type: "image/png" },
      { url: "/IRAG logos.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/IRAG logos.png", sizes: "180x180", type: "image/png" },
      { url: "/IRAG logos.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <PwaRegister />
            <AuthWrapper>
              {children}
            </AuthWrapper>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

