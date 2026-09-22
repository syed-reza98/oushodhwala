export const BUCKETS = [
  "media",
  "prescriptions",
  "consultations",
  "pod",
  "reports",
  "product-images",
] as const;

export type StorageBucket = (typeof BUCKETS)[number];
