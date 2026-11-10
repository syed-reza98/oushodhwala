import type { Metadata } from "next";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: "আমার অর্ডারসমূহ | Oushodhwala",
  description: "আপনার পূর্বের ও চলমান ঔষধ অর্ডারের বিস্তারিত তথ্য এবং লাইভ স্ট্যাটাস ট্র্যাক করুন।",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
