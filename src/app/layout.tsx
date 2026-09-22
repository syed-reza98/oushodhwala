import type { Metadata } from "next";
import "@/styles.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala",
    template: "%s | ঔষধওয়ালা",
  },
  description:
    "ঔষধওয়ালা থেকে অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য, ল্যাব টেস্ট ও ডাক্তার পরামর্শ নিন।",
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
