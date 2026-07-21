import ChatView from "@/components/ChatView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversa — Clique",
};

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatView conversationId={id} />;
}
