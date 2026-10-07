import type { Metadata } from "next";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "পছন্দের তালিকা | Oushodhwala",
  description: "আপনার পছন্দের ঔষধ ও স্বাস্থ্যসেবা পণ্যসমূহের তালিকা সংরক্ষণ করুন।",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
