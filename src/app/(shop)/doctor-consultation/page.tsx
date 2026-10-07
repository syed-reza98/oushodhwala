import type { Metadata } from "next";
import DoctorConsultationClient from "./DoctorConsultationClient";

export const metadata: Metadata = {
  title: "ডাক্তার পরামর্শ সেবা | Oushodhwala",
  description: "অভিজ্ঞ বিশেষজ্ঞ ডাক্তারদের সাথে সরাসরি অডিও, ভিডিও এবং চ্যাটের মাধ্যমে স্বাস্থ্য পরামর্শ নিন।",
};

export default function DoctorConsultationPage() {
  return <DoctorConsultationClient />;
}
