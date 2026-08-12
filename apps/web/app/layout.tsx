import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "coderev — public repo code review",
  description:
    "Review public GitHub repositories with Nvidia NIM or bring your own OpenAI-compatible key. No database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
