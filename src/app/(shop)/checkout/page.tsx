import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "চেকআউট | Oushodhwala",
  description: "ক্যাশ অন ডেলিভারি, বিকাশ বা নগদে ঔষধের নিরাপদ ও দ্রুত অর্ডার সম্পন্ন করুন।",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
