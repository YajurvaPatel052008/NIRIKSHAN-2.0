// DO NOT create additional root layouts or forget to import ./globals.css here — this file is the only place Tailwind gets loaded.
import { Noto_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  weight: ["400", "500", "600"]
});

export const metadata = {
  title: "NIRIKSHAN",
  description: "AI-powered Indian Standards recommendation engine"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <div className="fixed inset-x-0 top-0 z-50 flex h-1" aria-hidden="true">
          <div className="w-1/3 bg-[#FF9933]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138808]" />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
