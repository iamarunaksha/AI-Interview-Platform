import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../components/providers";
import { Navbar } from "../components/navbar";

export const metadata: Metadata = {
  title: "InterviewAI — Realistic Voice & Video Technical Interview Platform",
  description:
    "Practice realistic SDE and SAP technical interviews with an adaptive AI interviewer through voice and video.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
