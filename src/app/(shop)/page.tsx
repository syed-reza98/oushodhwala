import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: {
    absolute: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala",
  },
  description:
    "ঔষধওয়ালা থেকে অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য, ল্যাব টেস্ট ও ডাক্তার পরামর্শ নিন। ঢাকায় ২ ঘণ্টায় ডেলিভারি, সারাদেশে ২৪-৭২ ঘণ্টায়।",
  openGraph: {
    title: "ঔষধওয়ালা — অনলাইন ফার্মেসি | Oushodhwala",
    description: "অরিজিনাল ঔষধ, স্বাস্থ্য পণ্য ও ল্যাব টেস্ট অর্ডার করুন — ঘরে বসে।",
    url: "/",
  },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <HomeClient />;
}
