import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SiteNav } from "@/components/shell/SiteNav";

export const metadata: Metadata = {
  title: "GBS idea + solution catalog",
  description:
    "Search and governance layer over improvement ideas and their built solutions. All data is synthetic.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="site-title">
              <a href="/">
                <span className="site-mark" aria-hidden="true" />
                <span className="site-title-full">GBS idea + solution catalog</span>
                <span className="site-title-short" aria-hidden="true">
                  GBS
                </span>
              </a>
            </div>
            <SiteNav />
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
