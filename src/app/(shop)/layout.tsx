import { Layout } from "@/components/Layout";

export const dynamic = "force-dynamic";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
