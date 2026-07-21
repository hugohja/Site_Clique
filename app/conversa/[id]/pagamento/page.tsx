import CheckoutView from "@/components/CheckoutView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento em custódia — Clique" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CheckoutView conversationId={id} />;
}
