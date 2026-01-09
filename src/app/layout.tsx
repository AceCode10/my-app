
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ExamBoardProvider } from "@/contexts/ExamBoardContext";
import { QueryProvider } from "@/providers/query-provider";
import { PrefetchProvider } from "@/components/prefetch-provider";
import { SessionManager } from "@/components/session-manager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RevisionPlus",
  description: "The best revision materials for GCSE, IGCSE, AS & A Level students across all major exam boards.",
  icons: {
    icon: '/icon.svg',
  },
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
                  {children}
                  <Toaster />
                </ExamBoardProvider>
              </ThemeProvider>
            </PrefetchProvider>
          </SessionManager>
        </QueryProvider>
      </body>
    </html>
  );
}
