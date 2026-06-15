import type { Metadata } from "next";
import Providers from "./providers";
import Nav from "./components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waves",
  description: "Waves frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main>
            <Nav />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
