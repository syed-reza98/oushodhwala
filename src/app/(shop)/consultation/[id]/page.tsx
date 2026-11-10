import type { Metadata } from "next";
import ConsultationClient from "./ConsultationClient";

export const metadata: Metadata = {
  title: "ডাক্তার কনসালটেশন | Oushodhwala",
  description: "অনলাইন ডাক্তার কনসালটেশন রুম, অডিও/ভিডিও পরামর্শ ও ডিজিটাল প্রেসক্রিপশন।",
};

export default function ConsultationPage() {
  return <ConsultationClient />;
}
