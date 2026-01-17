
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ExamBoardProvider } from "@/contexts/ExamBoardContext";
import { GamificationProvider } from "@/contexts/GamificationContext";
import { QueryProvider } from "@/providers/query-provider";
import { PrefetchProvider } from "@/components/prefetch-provider";
import { SessionManager } from "@/components/session-manager";
import { PWARegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IGA Prep - IGCSE, GCSE & A-Level Exam Preparation",
  description: "Master your IGCSE, GCSE & A-Level exams with smart study tools, practice questions, and personalized learning.",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon.svg',
    apple: '/icons/icon-192x192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IGA Prep",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <SessionManager>
            <PrefetchProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <ExamBoardProvider>
                  <GamificationProvider>
                    {children}
                    <Toaster />
                    <PWARegister />
                  </GamificationProvider>
                </ExamBoardProvider>
              </ThemeProvider>
            </PrefetchProvider>
          </SessionManager>
        </QueryProvider>
      </body>
    </html>
  );
}
