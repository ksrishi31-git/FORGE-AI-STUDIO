import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ForgeAI Studio",
    template: "%s · ForgeAI Studio",
  },
  description: "Autonomous multi-agent software engineering platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} bg-background font-sans text-foreground`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
