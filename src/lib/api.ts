/**
 * Client API WordPress — consomme les endpoints REST mademo/v1/*.
 * En dev local (Vite sans WP), retombe sur les données statiques de fallback.
 */

declare global {
  interface Window {
    MADEMO_CONFIG?: {
      apiBase: string;
      nonce: string;
      siteUrl: string;
      uploadsUrl: string;
      isLoggedIn: boolean;
    };
  }
}

// URL de base : injectée par WordPress via wp_add_inline_script, sinon env Vite
export const API_BASE =
  window.MADEMO_CONFIG?.apiBase ??
  import.meta.env.VITE_WP_API_BASE ??
  "http://localhost:8888/wp-json/mademo/v1";

export const WP_NONCE = window.MADEMO_CONFIG?.nonce ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectStatus =
  | "intuition" | "documentation" | "recherche"
  | "expérimentation" | "production" | "en pause" | "terminé";

export type FragmentType =
  | "note" | "photographie" | "citation" | "hypothèse"
  | "question" | "expérience" | "résultat" | "échec" | "référence" | "décision";

export interface JournalEntry {
  date: string; title: string; content: string;
  type: "découverte" | "hypothèse" | "expérimentation" | "résultat" | "difficulté" | "décision";
}

export interface Project {
  id: string; wp_id: number;
  title: string; category: string; status: ProjectStatus; year: string;
  question: string; manifeste: string; description: string; lastUpdated: string;
  themes: string[]; tags: string[]; image: string; fragmentCount: number;
  journal: JournalEntry[];
  maintenant: { cherche: string; avancee: string; bloque: string | null; prochaine: string; question: string; };
  references: { title: string; author: string; year: string }[];
}

export interface Fragment {
  id: string; wp_id: number; number: string; title: string; date: string;
  type: FragmentType; content: string; status: string;
  keywords: string[]; projectIds: string[]; image?: string;
}

export interface ResearchQuestion {
  id: string; wp_id: number; question: string;
  projectIds: string[]; fragmentCount: number; lastUpdated: string;
}

export interface Text {
  id: string; wp_id: number; title: string; date: string; type: string;
  excerpt: string; body: string; relatedProjectId: string; readTime: string;
}

// ─── Fetcher générique ────────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (WP_NONCE) headers["X-WP-Nonce"] = WP_NONCE;

  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!res.ok) throw new Error(`API error ${res.status}: ${endpoint}`);
  return res.json() as Promise<T>;
}

// ─── API publique ─────────────────────────────────────────────────────────────

export const api = {
  projects:  () => apiFetch<Project[]>("/projects"),
  fragments: () => apiFetch<Fragment[]>("/fragments"),
  texts:     () => apiFetch<Text[]>("/texts"),
  research:  () => apiFetch<ResearchQuestion[]>("/research"),
};
