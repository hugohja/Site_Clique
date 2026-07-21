"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isValidCity } from "@/lib/types";
import { resizeImage } from "@/lib/image-resize";
import CityField from "@/components/CityField";

/** Edição do perfil de um cliente pelo admin: nome, cidade e foto. */
export default function ClientEditor({
  clientId,
  initialName,
  initialCity,
  initialPhoto,
}: {
  clientId: string;
  initialName: string;
  initialCity: string;
  initialPhoto: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [city, setCity] = useState(initialCity);
  const [currentPhoto] = useState(initialPhoto);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function pickPhoto(file: File | null) {
    if (newPhotoUrl) URL.revokeObjectURL(newPhotoUrl);
    setNewPhoto(file);
    setNewPhotoUrl(file ? URL.createObjectURL(file) : null);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Informe o nome." });
    if (city && !isValidCity(city))
      return setMsg({ ok: false, text: "Escolha uma cidade da lista (ou deixe em branco)." });

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("city", city);
    if (newPhoto) fd.set("profilePhoto", await resizeImage(newPhoto, { maxDim: 1200 }));

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/client/${clientId}`, { method: "PATCH", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: body.error ?? "Não foi possível salvar." });
        return;
      }
      setMsg({ ok: true, text: "Cliente atualizado." });
      pickPhoto(null);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Falha de conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pro-form" style={{ marginTop: 0 }} onSubmit={save}>
      <div className="field">
        <label htmlFor="ce-name">Nome</label>
        <input id="ce-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>

      <div className="field">
        <label htmlFor="ce-city">Cidade (opcional)</label>
        <CityField value={city} onChange={setCity} />
      </div>

      <div className="field">
        <span className="field-label">Foto de perfil</span>
        <div className="pe-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar" src={newPhotoUrl ?? currentPhoto} alt="" />
          <label className="btn btn-sm btn-ghost" htmlFor="ce-photo">
            Trocar foto
          </label>
          <input
            id="ce-photo"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {msg && <div className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</div>}
      <button type="submit" className="btn btn-sm" disabled={saving}>
        {saving ? "Salvando…" : "Salvar cliente"}
      </button>
    </form>
  );
}
