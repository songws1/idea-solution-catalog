import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GBS idea + solution catalog",
  description:
    "Search and governance layer over improvement ideas and their built solutions. All data is synthetic.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="site-title">
              <a href="/search">GBS idea + solution catalog</a>
            </div>
            <nav className="site-nav">
              <a href="/search">Search</a>
              <a href="/governance">Governance</a>
              <a href="/export">Export</a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="site-footer-inner">
            Prototype. Every record, person, and artifact link in this catalog is
            synthetic.
          </div>
        </footer>
      </body>
    </html>
  );
}
