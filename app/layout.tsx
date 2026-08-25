import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HireWise | Production-Grade AI Resume Screening & Candidate Matching",
  description:
    "Automate the initial screening of job applications with explainable AI evidence, deterministic matching rules, and instant Google Sheets synchronization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#e7e5e2] text-[#19191a] selection:bg-[#19191a] selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
