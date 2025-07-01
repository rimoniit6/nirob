"use client";

import { ThemeProvider } from "next-themes";
import { AppProvider } from '@/context/AppContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        <AppProvider>
          {children}
          <Toaster />
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
