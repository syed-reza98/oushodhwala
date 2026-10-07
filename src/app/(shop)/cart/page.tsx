import type { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "শপিং কার্ট | Oushodhwala",
  description: "আপনার কার্টে থাকা ঔষধ ও স্বাস্থ্যসেবা পণ্যসমূহ দেখুন এবং সহজে অর্ডার সম্পন্ন করুন।",
};

export default function CartPage() {
  return <CartClient />;
}
