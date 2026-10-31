import { Suspense } from "react";
import Link from "next/link";
import { LoginForm, type NacinPrijave } from "./LoginForm";
import { PrekidacTeme } from "@/components/PrekidacTeme";
import { isUlogaZaposlenika, NAZIVI_ULOGA } from "@/lib/auth/session";

export default function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <Suspense fallback={<p className="auth-body muted small">Učitavanje prijave...</p>}>
          <LoginPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ uloga?: string | string[] }>;
}) {
  const { uloga } = await searchParams;
  const poznataUloga: NacinPrijave | null =
    uloga === "licni" ? "licni" : isUlogaZaposlenika(uloga) ? uloga : null;

  return (
    <>
      <div className="auth-head">
        <Link className="row" href="/" style={{ gap: 8 }}>
          <span className="btn btn-ghost btn-sm" style={{ padding: "0 10px" }}>‹</span>
          <span className="small bold">Uloge</span>
        </Link>
        <div className="row" style={{ gap: 8 }}>
          <PrekidacTeme />
          {poznataUloga && (
            <span className="badge badge-izdato">
              {poznataUloga === "licni" ? "Lični PIN" : NAZIVI_ULOGA[poznataUloga]}
            </span>
          )}
        </div>
      </div>
      <div className="auth-body" style={{ padding: "28px 26px 34px" }}>
        {poznataUloga ? (
          <LoginForm uloga={poznataUloga} />
        ) : (
          <div className="empty">
            <h3>Odaberite ulogu</h3>
            <p>Za prijavu prvo odaberite ulogu ovog uređaja.</p>
            <Link href="/" className="btn btn-primary mt-4">Odaberi ulogu</Link>
          </div>
        )}
      </div>
    </>
  );
}
