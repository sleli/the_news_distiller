"use client";

import { useState } from "react";

export default function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && password !== confirmPassword) {
      setError("Le password non coincidono.");
      setLoading(false);
      return;
    }

    const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/signin";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      window.location.href = "/distill";
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Si è verificato un errore. Riprova.");
    setLoading(false);
  };

  return (
    <div className="np-paper">
      {/* MASTHEAD */}
      <header className="np-masthead">
        <div className="np-masthead-rule-top" />
        <div className="np-masthead-rule-thin" />
        <div className="np-masthead-meta">
          <span>Vol. 1 — No. 1</span>
          <span>The News Distiller</span>
          <span>Accesso Riservato</span>
        </div>
        <div className="np-masthead-title">
          The <em>News</em> Distiller
        </div>
        <div className="np-masthead-tagline">
          La verità in tutte le sue contraddizioni — ogni giorno, senza filtri
        </div>
      </header>

      {/* RED BANNER */}
      <div className="np-red-banner">
        ★ Accedi per distillare le notizie — scopri cosa dicono davvero i
        giornali ★
      </div>

      {/* CONTENT */}
      <div className="np-content">
        <div className="np-rule-double" />

        <div
          style={{
            maxWidth: 420,
            margin: "2rem auto",
          }}
        >
          <div className="np-auth-box">
            <div className="np-auth-box-title">
              {isSignUp ? "Registrati alla Redazione" : "Accedi alla Redazione"}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="np-form-group">
                <label className="np-form-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="np-form-input"
                  placeholder="tu@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="np-form-group">
                <label className="np-form-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="np-form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {isSignUp && (
                <div className="np-form-group">
                  <label className="np-form-label" htmlFor="confirmPassword">
                    Conferma Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="np-form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              )}

              {error && <p className="np-error-msg">{error}</p>}

              <button
                type="submit"
                className="np-btn red"
                disabled={loading}
                style={{ marginTop: ".5rem" }}
              >
                {loading
                  ? "Caricamento..."
                  : isSignUp
                    ? "★ Registrati"
                    : "★ Entra nella Redazione"}
              </button>
            </form>

            <div className="np-auth-toggle">
              {isSignUp ? "Hai già un account?" : "Prima volta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setConfirmPassword("");
                }}
              >
                {isSignUp ? "Accedi" : "Registrati gratis"}
              </button>
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "1.2rem",
              fontFamily: "var(--font-body, Georgia, serif)",
              fontSize: ".78rem",
              fontStyle: "italic",
              color: "var(--ink-mid)",
            }}
          >
            Il Distillatore analizza le notizie da decine di fonti e ti
            restituisce le posizioni a confronto — senza filtri.
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="np-footer">
        <span>© 1974 The News Distiller</span>
        <span>Powered by Anthropic Claude + Tavily</span>
        <span>Fondato nel 1974 — Milano, Italia</span>
      </footer>
    </div>
  );
}
