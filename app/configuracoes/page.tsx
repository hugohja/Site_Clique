import SettingsPanel from "@/components/SettingsPanel";

export const metadata = { title: "Configurações — Clique" };

export default function ConfiguracoesPage() {
  return (
    <div className="container form-page">
      <h1>Configurações</h1>
      <SettingsPanel />
    </div>
  );
}
