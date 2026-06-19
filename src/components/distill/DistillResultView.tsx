import type { DistillResult } from "@/lib/claude";

interface Props {
  result: DistillResult;
  topic: string;
  tone: string;
}

export function DistillResultView({ result, topic, tone }: Props) {
  return (
    <div data-testid="distill-result">
      {/* HEADER */}
      <div style={{ marginBottom: "1.2rem" }}>
        <span className="np-hl-kicker">Distillato — {tone}</span>
        <div className="np-hl-mega" style={{ lineHeight: 1.1 }}>
          {topic}
        </div>
      </div>

      <div className="np-rule-double" />

      {/* SINTESI */}
      <section data-testid="synthesis-section" style={{ marginBottom: "1.6rem" }}>
        <div
          className="np-sidebar-label"
          style={{ marginBottom: ".5rem" }}
        >
          Sintesi
        </div>
        <p
          style={{
            fontFamily: "var(--font-body, Georgia, serif)",
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "var(--ink)",
          }}
        >
          {result.summary}
        </p>
      </section>

      <div className="np-rule" style={{ marginBottom: "1.4rem" }} />

      {/* POSIZIONI */}
      <div className="np-col-2" style={{ marginBottom: "1.6rem" }}>
        {result.positions.map((pos, i) => (
          <section
            key={i}
            data-testid="position-section"
            className="np-col"
            style={{ marginBottom: "1rem" }}
          >
            <span className="np-hl-kicker">{pos.label}</span>
            <div
              style={{
                fontFamily: "var(--font-headline, 'Times New Roman', serif)",
                fontSize: "1.15rem",
                fontWeight: 700,
                lineHeight: 1.3,
                marginBottom: ".4rem",
                color: "var(--ink)",
              }}
            >
              {pos.headline}
            </div>
            <p
              style={{
                fontFamily: "var(--font-body, Georgia, serif)",
                fontSize: ".875rem",
                lineHeight: 1.55,
                color: "var(--ink)",
              }}
            >
              {pos.body}
            </p>
          </section>
        ))}
      </div>

      {/* FONTI */}
      {result.sources.length > 0 && (
        <>
          <div className="np-rule" style={{ marginBottom: "1rem" }} />
          <section>
            <div className="np-sidebar-label" style={{ marginBottom: ".6rem" }}>
              Fonti
            </div>
            <ul
              data-testid="sources-list"
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {result.sources.map((src, i) => (
                <li key={i} style={{ marginBottom: ".4rem" }}>
                  <a
                    data-testid="source-link"
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                      fontSize: ".8rem",
                      color: "var(--ink)",
                      textDecoration: "underline",
                    }}
                  >
                    {src.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
