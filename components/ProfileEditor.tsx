"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_TYPES, isValidCity } from "@/lib/types";
import { resizeImage } from "@/lib/image-resize";
import CityField from "@/components/CityField";
import PortfolioEditor, { type PortfolioEntry } from "@/components/PortfolioEditor";

interface Pro {
  name: string;
  city: string;
  bio: string;
  specialties: string[];
  profilePhotoUrl: string;
  portfolio: { id: string; url: string; focus: string; cover: boolean }[];
}

/** Edição do perfil do profissional (dentro de Configurações). */
export default function ProfileEditor({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [checkedSpecs, setCheckedSpecs] = useState<string[]>([]);
  const [outras, setOutras] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState("");
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/professionals/${professionalId}`, { cache: "no-store" });
    if (!res.ok) return;
    const p: Pro = await res.json();
    setName(p.name);
    setCity(p.city);
    setBio(p.bio);
    setCheckedSpecs(p.specialties.filter((s) => (EVENT_TYPES as readonly string[]).includes(s)));
    setOutras(p.specialties.filter((s) => !(EVENT_TYPES as readonly string[]).includes(s)).join(", "));
    setCurrentPhoto(p.profilePhotoUrl);
    setPortfolio(
      p.portfolio.map((it) => ({ key: `ex-${it.id}`, url: it.url, focus: it.focus, cover: it.cover }))
    );
    setLoaded(true);
  }, [professionalId]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSpec(s: string, on: boolean) {
    setCheckedSpecs((prev) => (on ? [...prev, s] : prev.filter((x) => x !== s)));
  }

  function pickPhoto(file: File | null) {
    if (newPhotoUrl) URL.revokeObjectURL(newPhotoUrl);
    setNewPhoto(file);
    setNewPhotoUrl(file ? URL.createObjectURL(file) : null);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const specialties = [
      ...checkedSpecs,
      ...outras.split(",").map((s) => s.trim()).filter(Boolean),
    ];
    if (name.trim().length < 2) return setMsg({ ok: false, text: "Informe o nome." });
    if (!isValidCity(city)) return setMsg({ ok: false, text: "Escolha uma cidade da lista." });
    if (specialties.length === 0)
      return setMsg({ ok: false, text: "Escolha ao menos uma especialidade." });
    if (bio.trim().length < 10) return setMsg({ ok: false, text: "Escreva uma bio maior." });
    if (portfolio.length < 3)
      return setMsg({ ok: false, text: "O portfólio precisa de ao menos 3 fotos." });

    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("city", city);
    fd.set("bio", bio.trim());
    specialties.forEach((s) => fd.append("specialties", s));
    if (newPhoto) fd.set("profilePhoto", await resizeImage(newPhoto, { maxDim: 1200 }));

    const metaArr: { url?: string; newIndex?: number; focus: string; cover: boolean }[] = [];
    for (const p of portfolio) {
      if (p.file) {
        const idx = fd.getAll("portfolioNewPhotos").length;
        fd.append("portfolioNewPhotos", await resizeImage(p.file, { maxDim: 1600 }));
        metaArr.push({ newIndex: idx, focus: p.focus, cover: p.cover });
      } else {
        metaArr.push({ url: p.url, focus: p.focus, cover: p.cover });
      }
    }
    fd.set("portfolioMeta", JSON.stringify(metaArr));

    setSaving(true);
    try {
      const res = await fetch("/api/account/professional", { method: "PATCH", body: fd });
      const body = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: body.error ?? "Não foi possível salvar." });
        return;
      }
      setMsg({ ok: true, text: "Perfil atualizado." });
      pickPhoto(null);
      await load();
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Falha de conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <p className="mono" style={{ color: "var(--text-dim)" }}>
        carregando perfil…
      </p>
    );
  }

  return (
    <form className="pro-form" style={{ marginTop: 0 }} onSubmit={save}>
      <div className="field">
        <label htmlFor="pe-name">Nome ou estúdio</label>
        <input id="pe-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>

      <div className="field">
        <label htmlFor="pe-city">Cidade</label>
        <CityField value={city} onChange={setCity} required />
      </div>

      <div className="field">
        <span className="field-label">Foto de perfil</span>
        <div className="pe-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar" src={newPhotoUrl ?? currentPhoto} alt="" />
          <label className="btn btn-sm btn-ghost" htmlFor="pe-photo">
            Trocar foto
          </label>
          <input
            id="pe-photo"
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="field">
        <span className="field-label">Especialidades</span>
        <div className="checkbox-grid">
          {EVENT_TYPES.map((s) => (
            <label key={s} className="check-pill">
              <input
                type="checkbox"
                checked={checkedSpecs.includes(s)}
                onChange={(e) => toggleSpec(s, e.target.checked)}
              />
              {s}
            </label>
          ))}
        </div>
        <input
          value={outras}
          onChange={(e) => setOutras(e.target.value)}
          placeholder="Outros (separe por vírgula)"
        />
      </div>

      <div className="field">
        <label htmlFor="pe-bio">Bio</label>
        <textarea id="pe-bio" value={bio} onChange={(e) => setBio(e.target.value)} required minLength={10} />
      </div>

      <div className="field">
        <span className="field-label">Portfólio</span>
        <PortfolioEditor items={portfolio} onChange={setPortfolio} />
      </div>

      {msg && <div className={msg.ok ? "form-ok" : "form-error"}>{msg.text}</div>}
      <button type="submit" className="btn btn-sm" disabled={saving}>
        {saving ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
