import type { Metadata } from "next";
import "@/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ঔষধওয়ালা",
  description: "Online pharmacy — Oushodhwala",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
