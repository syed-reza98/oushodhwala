import type { Metadata } from "next";
import LabTestClient from "./LabTestClient";

export const metadata: Metadata = {
  title: "ল্যাব টেস্ট ও ডায়াগনস্টিক | Oushodhwala",
  description: "ঘরে বসেই ল্যাব টেস্টের স্যাম্পল কালেকশন বুকিং এবং ২৪ ঘণ্টায় ডিজিটাল রিপোর্ট সুবিধা।",
};

export default function LabTestPage() {
  return <LabTestClient />;
}
