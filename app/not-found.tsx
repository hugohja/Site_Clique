import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container" style={{ paddingBlock: "4rem" }}>
      <div className="empty-state">
        <span className="mono">404_NOT_FOUND.ERR</span>
        Essa página não existe (ou o perfil saiu do ar).{" "}
        <Link href="/" style={{ textDecoration: "underline" }}>
          Voltar pra busca
        </Link>
      </div>
    </div>
  );
}
