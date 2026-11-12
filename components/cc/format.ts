const ACRONYMS = new Set(["etl", "sql", "bi", "aws", "gcp", "css", "html", "api", "apis", "ci/cd", "ml", "ai", "ui", "ux", "llm", "nlp", "dsa", "qa"]);

/** "power bi" -> "Power BI", "etl" -> "ETL", "react native" -> "React Native". */
export function prettySkill(skill: string) {
  return skill
    .split(" ")
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** "2026-11-12T..." -> "12 Nov". Empty string for invalid input. */
export function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
