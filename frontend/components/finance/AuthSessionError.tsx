"use client";

export default function AuthSessionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="auth-error-page" role="alert" aria-labelledby="auth-error-title">
      <div className="auth-error-card">
        <span className="auth-error-kicker">SESSÃO INDISPONÍVEL</span>
        <h1 id="auth-error-title">Não foi possível verificar sua sessão.</h1>
        <p>{message}</p>
        <button className="primary-button" type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
