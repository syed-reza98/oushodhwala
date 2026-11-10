import type { Metadata } from "next";
import MedicinesClient from "./MedicinesClient";

export const metadata: Metadata = {
  title: "সকল ঔষধ ও জেনেরিক নির্দেশিকা | Oushodhwala",
  description: "ব্র্যান্ড ও জেনেরিক নাম অনুযায়ী ঔষধ খুঁজুন, সেবনবিধি, দাম এবং বিকল্প ব্র্যান্ডের তুলনা দেখুন।",
};

export default function MedicinesPage() {
  return <MedicinesClient />;
}
