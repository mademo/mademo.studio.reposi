import { useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Search, X, Plus, Grid, List } from "lucide-react";
import { useData } from "../lib/useData";
import type { Project, Fragment, ResearchQuestion, Text, ProjectStatus, FragmentType, JournalEntry } from "../lib/api";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_ORDER: ProjectStatus[] = [
  "intuition","documentation","recherche","expérimentation","production","en pause","terminé",
];

const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  intuition: 8, documentation: 22, recherche: 38, expérimentation: 55,
  production: 72, "en pause": 45, terminé: 100,
};

const CONSTELLATION_THEME_NODES = [
  { id: "corps", x: 110, y: 200, r: 8 }, { id: "matière", x: 390, y: 90, r: 9 },
  { id: "perception", x: 540, y: 210, r: 7 }, { id: "lumière", x: 480, y: 60, r: 7 },
  { id: "mémoire", x: 130, y: 380, r: 8 }, { id: "politique", x: 640, y: 380, r: 8 },
  { id: "vivant", x: 480, y: 400, r: 7 }, { id: "handicap", x: 120, y: 300, r: 7 },
  { id: "transformation", x: 320, y: 400, r: 8 }, { id: "soin", x: 270, y: 430, r: 6 },
  { id: "technologie", x: 600, y: 90, r: 7 },
];

const PROJECT_NODE_POSITIONS: Record<string, { x: number; y: number; r: number }> = {
  "trois-doigts":         { x: 240, y: 180, r: 18 },
  "oeil-matiere":         { x: 460, y: 140, r: 20 },
  "la-monade":            { x: 370, y: 280, r: 22 },
  "futur-animiste":       { x: 560, y: 310, r: 16 },
  "fragments-joaillerie": { x: 200, y: 340, r: 17 },
  "direction-artistique": { x: 620, y: 180, r: 14 },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function statusColor(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    intuition: "text-muted-foreground border-muted-foreground/40",
    documentation: "text-muted-foreground border-muted-foreground/50",
    recherche: "text-foreground border-foreground/40",
    expérimentation: "text-accent border-accent",
    production: "text-accent border-accent bg-accent/10",
    "en pause": "text-muted-foreground border-muted-foreground/30",
    terminé: "text-muted-foreground border-muted-foreground/30",
  };
  return map[status];
}

function journalTypeColor(type: JournalEntry["type"]): string {
  const map: Record<JournalEntry["type"], string> = {
    découverte: "text-green-700", hypothèse: "text-blue-700", expérimentation: "text-accent",
    résultat: "text-foreground", difficulté: "text-orange-700", décision: "text-purple-700",
  };
  return map[type];
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`text-[9px] tracking-[0.18em] uppercase border px-1.5 py-0.5 leading-none ${statusColor(status)}`}>
      {status}
    </span>
  );
}

function FragmentTypeBadge({ type }: { type: FragmentType }) {
  return <span className="text-[9px] tracking-[0.15em] uppercase text-accent font-mono">{type}</span>;
}

// ─── Cursor Image Follower ────────────────────────────────────────────────────

function useCursorImage() {
  const [cursor, setCursor] = useState<{ src: string; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const onEnter = useCallback((src: string, e: React.MouseEvent) => { setCursor({ src, x: e.clientX, y: e.clientY }); }, []);
  const onMove  = useCallback((src: string, e: React.MouseEvent) => { setCursor({ src, x: e.clientX, y: e.clientY }); }, []);
  const onLeave = useCallback(() => setCursor(null), []);
  const CursorEl = cursor ? (
    <div ref={ref} className="fixed pointer-events-none z-[999]"
      style={{ left: cursor.x + 18, top: cursor.y - 100, width: 280, height: 185,
        transition: "left 0.06s ease-out, top 0.06s ease-out" }}>
      <img src={cursor.src} alt="" className="w-full h-full object-cover shadow-xl" />
    </div>
  ) : null;
  return { onEnter, onMove, onLeave, CursorEl };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="pt-11">
      <div className="px-6 lg:px-16 py-10 border-b border-border">
        <Skeleton className="h-3 w-20 mb-4" />
        <Skeleton className="h-14 w-64 mb-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-r border-b border-border" style={{ height: "42vh" }}>
            <Skeleton className="w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Banner mode démonstration ────────────────────────────────────────────────

function FallbackBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] bg-foreground text-background text-[11px] px-5 py-3 flex items-center gap-5 shadow-lg max-w-sm w-full mx-4">
      <span className="flex-1">Mode démonstration — connectez WordPress pour les vraies données.</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity shrink-0"><X size={12} /></button>
    </div>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Atelier", page: "atelier" }, { label: "Projets", page: "projets" },
  { label: "Fragments", page: "fragments" }, { label: "Recherches", page: "recherches" },
  { label: "Textes", page: "textes" }, { label: "À propos", page: "a-propos" },
];

function Nav({ page, navigate, filCount, onSearchOpen, onFilOpen }: {
  page: string; navigate: (p: string) => void;
  filCount: number; onSearchOpen: () => void; onFilOpen: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (p: string) => { navigate(p); setMenuOpen(false); };
  const isProject = page.startsWith("projet/");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-6 lg:px-12 h-12">
          <button onClick={() => go("atelier")} className="text-base leading-none text-foreground hover:text-accent transition-colors"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
            Mademo studio
          </button>
          <nav className="hidden lg:flex items-center gap-7">
            {NAV_ITEMS.map(item => {
              const active = page === item.page || (item.page === "projets" && isProject);
              return (
                <button key={item.page} onClick={() => go(item.page)}
                  className={`text-[11px] tracking-wide transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {item.label}
                </button>
              );
            })}
            <button onClick={() => go("constellation")}
              className={`text-[11px] tracking-wide transition-colors ${page === "constellation" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Constellation
            </button>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={onSearchOpen} aria-label="Rechercher" className="text-muted-foreground hover:text-foreground transition-colors"><Search size={14} /></button>
            {filCount > 0 && (
              <button onClick={onFilOpen} className="text-[10px] text-accent border border-accent px-2 py-0.5 hover:bg-accent hover:text-accent-foreground transition-colors">
                Fil ({filCount})
              </button>
            )}
            <button aria-label="Ajouter un fragment" className="text-muted-foreground hover:text-foreground transition-colors border border-muted-foreground hover:border-foreground p-0.5"><Plus size={12} /></button>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors text-[11px]">
              {menuOpen ? "×" : "Menu"}
            </button>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background pt-12 px-6 flex flex-col justify-center">
          {[...NAV_ITEMS, { label: "Constellation", page: "constellation" }].map(item => (
            <button key={item.page} onClick={() => go(item.page)}
              className="text-4xl text-left py-5 border-b border-border hover:text-accent transition-colors"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Search Modal ─────────────────────────────────────────────────────────────

function SearchModal({ onClose, navigate, projects, fragments, texts }: {
  onClose: () => void; navigate: (p: string) => void;
  projects: Project[]; fragments: Fragment[]; texts: Text[];
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const results = query.length > 1 ? [
    ...projects.filter(p => p.title.toLowerCase().includes(q) || p.question.toLowerCase().includes(q))
      .map(p => ({ type: "projet" as const, id: `projet/${p.id}`, label: p.title, sub: p.question })),
    ...fragments.filter(f => f.title.toLowerCase().includes(q))
      .map(f => ({ type: "fragment" as const, id: "fragments", label: `${f.number} — ${f.title}`, sub: f.type })),
    ...texts.filter(t => t.title.toLowerCase().includes(q))
      .map(t => ({ type: "texte" as const, id: "textes", label: t.title, sub: t.type })),
  ] : [];

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="bg-background border border-border w-full max-w-xl">
        <div className="flex items-center border-b border-border px-5">
          <Search size={14} className="opacity-40 shrink-0" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Chercher un projet, fragment, texte…"
            className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground" />
          <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity"><X size={14} /></button>
        </div>
        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto">
            {results.map((r, i) => (
              <button key={i} onClick={() => { navigate(r.id); onClose(); }}
                className="w-full text-left flex items-start gap-5 px-5 py-3 border-b border-border hover:bg-card transition-colors">
                <span className="text-[9px] tracking-widest uppercase text-accent font-mono w-12 shrink-0 mt-0.5">{r.type}</span>
                <div>
                  <p className="text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {query.length > 1 && results.length === 0 && (
          <p className="px-5 py-5 text-sm text-muted-foreground">Aucun résultat pour « {query} »</p>
        )}
      </div>
    </div>
  );
}

// ─── Fil de recherche ─────────────────────────────────────────────────────────

function FilDeRecherche({ items, onClose, onRemove, navigate, projects, fragments }: {
  items: string[]; onClose: () => void; onRemove: (id: string) => void;
  navigate: (p: string) => void; projects: Project[]; fragments: Fragment[];
}) {
  const myProjects  = projects.filter(p => items.includes(p.id));
  const myFragments = fragments.filter(f => items.includes(f.id));
  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-background border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <p className="text-xs tracking-widest uppercase">Fil de recherche</p>
        <button onClick={onClose} className="opacity-40 hover:opacity-80 transition-opacity"><X size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && <p className="px-6 py-8 text-sm text-muted-foreground leading-relaxed">Ajoutez des projets ou fragments à votre fil.</p>}
        {myProjects.map(p => (
          <div key={p.id} className="border-b border-border">
            <div className="h-28 overflow-hidden bg-muted">
              {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[9px] tracking-widest uppercase text-accent mb-1">projet</p>
                  <p className="text-sm">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{p.question}</p>
                </div>
                <button onClick={() => onRemove(p.id)} className="opacity-30 hover:opacity-70 transition-opacity shrink-0"><X size={12} /></button>
              </div>
              <button onClick={() => navigate(`projet/${p.id}`)} className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors mt-2">Ouvrir →</button>
            </div>
          </div>
        ))}
        {myFragments.map(f => (
          <div key={f.id} className="border-b border-border px-6 py-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[9px] tracking-widest uppercase text-accent mb-1">{f.number}</p>
                <p className="text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{f.content}</p>
              </div>
              <button onClick={() => onRemove(f.id)} className="opacity-30 hover:opacity-70 transition-opacity shrink-0"><X size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="border-t border-border px-6 py-5">
          <p className="text-xs text-muted-foreground">{items.length} éléments.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page: Atelier ────────────────────────────────────────────────────────────

function PageAtelier({ navigate, addToFil, projects, fragments, research }: {
  navigate: (p: string) => void; addToFil: (id: string) => void;
  projects: Project[]; fragments: Fragment[]; research: ResearchQuestion[];
}) {
  const active   = projects.filter(p => p.status !== "terminé" && p.status !== "en pause");
  const featured = active[0];
  const rest     = active.slice(1);
  const recent   = fragments.slice(0, 4);

  if (!featured) return null;

  return (
    <div className="pt-12 min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden cursor-pointer group" style={{ height: "90vh" }}
        onClick={() => navigate(`projet/${featured.id}`)}>
        {featured.image && (
          <img src={featured.image} alt={featured.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.4s] ease-out" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

        {/* Masthead top */}
        <div className="absolute top-0 left-0 right-0 px-8 lg:px-16 pt-8 flex items-start justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-2">L'atelier vivant</p>
            <p className="text-4xl lg:text-6xl font-light text-white leading-none"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
              Mademo studio
            </p>
          </div>
          <p className="text-[9px] tracking-widest uppercase text-white/35 hidden lg:block leading-relaxed text-right">
            Artiste<br />Designer<br />Photographe<br />Autrice
          </p>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-8 lg:px-16 pb-14">
          <div className="flex items-end justify-between gap-8">
            <div className="max-w-2xl">
              <StatusBadge status={featured.status} />
              <h2 className="text-4xl lg:text-7xl font-light text-white mt-4 mb-4 leading-[0.95]">{featured.title}</h2>
              <p className="text-white/75 text-xl lg:text-2xl leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                {featured.manifeste}
              </p>
            </div>
            <div className="hidden lg:block shrink-0 text-right pb-1">
              <p className="text-white/40 text-xs mb-1.5">{featured.fragmentCount} fragments</p>
              <p className="text-white/40 text-xs">{featured.lastUpdated}</p>
              <div className="flex items-center gap-2 mt-4 justify-end">
                <div className="w-28 h-px bg-white/20 relative">
                  <div className="absolute left-0 top-0 h-px bg-white" style={{ width: `${STATUS_PROGRESS[featured.status]}%` }} />
                </div>
                <span className="text-[9px] text-white/40">{STATUS_PROGRESS[featured.status]}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* En ce moment */}
      <div className="border-b border-border">
        <div className="px-8 lg:px-16 pt-14 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3">En ce moment</p>
            <p className="text-2xl lg:text-4xl font-light text-foreground/60"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
              {active.length} projets actifs
            </p>
          </div>
          <button onClick={() => navigate("projets")} className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors pb-1">
            Tout voir →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-border">
          {rest.map(project => (
            <div key={project.id} className="relative border-r border-b border-border overflow-hidden cursor-pointer group"
              style={{ height: "48vh" }} onClick={() => navigate(`projet/${project.id}`)}>
              {project.image && (
                <img src={project.image} alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1s] ease-out" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/35 transition-colors duration-500" />
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={project.status} />
                  <span className="text-[9px] text-white/45">{project.year}</span>
                </div>
                <p className="text-white text-xl lg:text-2xl font-light leading-snug">{project.title}</p>
                <p className="text-white/75 text-sm leading-relaxed mt-3 max-w-xs opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                  {project.manifeste}
                </p>
                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  <div className="flex-1 h-px bg-white/20 relative">
                    <div className="absolute left-0 top-0 h-px bg-white" style={{ width: `${STATUS_PROGRESS[project.status]}%` }} />
                  </div>
                  <span className="text-[9px] text-white/45 tabular-nums">{STATUS_PROGRESS[project.status]}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derniers fragments */}
      <div className="border-b border-border">
        <div className="px-8 lg:px-16 pt-14 pb-6 flex items-end justify-between">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3">Derniers fragments</p>
            <p className="text-2xl lg:text-4xl font-light text-foreground/60"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
              {fragments.length} au total
            </p>
          </div>
          <button onClick={() => navigate("fragments")} className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors pb-1">Tout voir →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-border">
          {recent.map(fragment => (
            <div key={fragment.id} className="border-r border-b border-border group overflow-hidden">
              {fragment.image ? (
                <div className="relative overflow-hidden" style={{ height: "220px" }}>
                  <img src={fragment.image} alt={fragment.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-400" />
                  <div className="absolute top-4 left-4 right-4 flex justify-between">
                    <FragmentTypeBadge type={fragment.type} />
                    <span className="text-[9px] text-white/70 font-mono">{fragment.number}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-card flex items-center justify-center border-b border-border" style={{ height: "100px" }}>
                  <span className="text-[10px] font-mono text-muted-foreground">{fragment.number}</span>
                </div>
              )}
              <div className="p-5">
                {!fragment.image && <FragmentTypeBadge type={fragment.type} />}
                <p className="text-sm leading-snug mt-2 mb-2">{fragment.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{fragment.content}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{fragment.date}</span>
                  <button onClick={() => addToFil(fragment.id)} className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-accent transition-colors">+ Fil</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question ouverte */}
      {research[0] && (
        <div className="px-8 lg:px-16 py-20 border-b border-border grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-8">Question ouverte</p>
            <p className="text-3xl lg:text-5xl font-light leading-tight text-foreground/80"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
              {research[0].question}
            </p>
            <button onClick={() => navigate("recherches")} className="mt-8 text-[9px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">
              Explorer les questions →
            </button>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 border-t border-border lg:border-t-0 lg:border-l lg:border-border pt-8 lg:pt-0 lg:pl-10">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-6">Projets liés</p>
            {research[0].projectIds.map(pid => {
              const p = projects.find(pr => pr.id === pid);
              if (!p) return null;
              return (
                <button key={pid} onClick={() => navigate(`projet/${pid}`)}
                  className="w-full text-left py-4 border-b border-border flex items-center justify-between group">
                  <span className="text-sm group-hover:text-accent transition-colors">{p.title}</span>
                  <StatusBadge status={p.status} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-8 lg:px-16 py-6 flex items-center justify-between border-t border-border">
        <span className="text-[9px] text-muted-foreground">© Mademo studio, 2025</span>
        <div className="flex gap-6">
          {["Instagram", "Vimeo", "Mail"].map(s => (
            <button key={s} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page: Projets ────────────────────────────────────────────────────────────

function PageProjets({ navigate, addToFil, projects }: {
  navigate: (p: string) => void; addToFil: (id: string) => void; projects: Project[];
}) {
  const [filter, setFilter] = useState<ProjectStatus | null>(null);
  const visible = filter ? projects.filter(p => p.status === filter) : projects;
  const { onEnter, onMove, onLeave, CursorEl } = useCursorImage();

  return (
    <div className="pt-12 min-h-screen">
      {CursorEl}
      <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border">
        <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Index</p>
        <h2 className="text-5xl lg:text-8xl font-light leading-none mb-10"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
          Projets
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter(null)}
            className={`text-[9px] tracking-widest uppercase px-2.5 py-1 border transition-colors ${!filter ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
            Tous
          </button>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-[9px] tracking-widest uppercase px-2.5 py-1 border transition-colors ${filter === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border">
        {visible.map((project, i) => (
          <div key={project.id} className="relative border-r border-b border-border overflow-hidden cursor-pointer group"
            style={{ height: "55vh" }} onClick={() => navigate(`projet/${project.id}`)}
            onMouseEnter={project.image ? e => onEnter(project.image, e) : undefined}
            onMouseMove={project.image ? e => onMove(project.image, e) : undefined}
            onMouseLeave={project.image ? onLeave : undefined}>
            {project.image && (
              <img src={project.image} alt={project.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1s] ease-out" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors duration-500" />
            <div className="absolute top-5 left-6">
              <span className="text-[9px] font-mono text-white/35">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-7">
              <StatusBadge status={project.status} />
              <h3 className="text-2xl lg:text-3xl font-light text-white mt-3 mb-2 leading-tight">{project.title}</h3>
              <p className="text-white/0 group-hover:text-white/70 text-sm leading-relaxed transition-colors duration-400 line-clamp-2"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                {project.manifeste}
              </p>
              <div className="flex items-center justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="flex flex-wrap gap-1">
                  {project.themes.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] text-white/45 border border-white/20 px-1 py-0.5">{t}</span>
                  ))}
                </div>
                <button onClick={e => { e.stopPropagation(); addToFil(project.id); }}
                  className="text-[9px] tracking-widest uppercase text-white/45 hover:text-white transition-colors">+ Fil</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page: Projet Détail ──────────────────────────────────────────────────────

type ProjectTab = "maintenant" | "journal" | "atlas" | "recherche" | "connexions" | "synthèse";

function PageProjetDetail({ project, navigate, addToFil, projects, fragments }: {
  project: Project; navigate: (p: string) => void; addToFil: (id: string) => void;
  projects: Project[]; fragments: Fragment[];
}) {
  const [tab, setTab] = useState<ProjectTab>("maintenant");
  const projectFragments = fragments.filter(f => f.projectIds.includes(project.id));
  const idx     = projects.findIndex(p => p.id === project.id);
  const next    = projects[(idx + 1) % projects.length];
  const related = projects.filter(p => p.id !== project.id && p.themes.some(t => project.themes.includes(t))).slice(0, 3);
  const { onEnter, onMove, onLeave, CursorEl } = useCursorImage();

  const TABS: { id: ProjectTab; label: string }[] = [
    { id: "maintenant", label: "Maintenant" }, { id: "journal", label: "Journal" },
    { id: "atlas", label: "Atlas" }, { id: "recherche", label: "Recherche" },
    { id: "connexions", label: "Connexions" }, { id: "synthèse", label: "Synthèse" },
  ];

  return (
    <div className="pt-12 min-h-screen">
      {CursorEl}
      <div className="px-6 lg:px-12 py-3.5 border-b border-border flex items-center justify-between">
        <button onClick={() => navigate("projets")} className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors">← Projets</button>
        <div className="flex items-center gap-4">
          <StatusBadge status={project.status} />
          <span className="text-[10px] text-muted-foreground">{project.year}</span>
          <button onClick={() => addToFil(project.id)} className="text-[10px] tracking-widest uppercase text-muted-foreground hover:text-accent transition-colors">+ Fil</button>
        </div>
      </div>

      <div className="relative overflow-hidden group" style={{ height: "78vh" }}>
        {project.image && (
          <img src={project.image} alt={project.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
        <div className="absolute bottom-0 left-0 right-0 px-8 lg:px-16 pb-14">
          <h1 className="text-5xl lg:text-8xl font-light text-white leading-none mb-5"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontOpticalSizing: "auto" }}>
            {project.title}
          </h1>
          <p className="text-white/70 text-xl lg:text-2xl leading-relaxed max-w-2xl"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
            {project.manifeste}
          </p>
        </div>
      </div>

      <div className="px-8 lg:px-16 py-10 border-b border-border grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Question centrale</p>
          <p className="text-lg lg:text-xl leading-relaxed"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
            {project.question}
          </p>
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          <div className="flex flex-wrap gap-1 mb-4">
            {project.themes.map(t => (
              <span key={t} className="text-[9px] border border-border px-1.5 py-0.5 text-muted-foreground">{t}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{project.fragmentCount} fragments · {project.lastUpdated}</p>
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <div className="flex px-6 lg:px-12">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-[11px] tracking-wide px-5 py-4 border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {tab === "maintenant" && (
          <div className="px-8 lg:px-16 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
            {[
              { label: "Ce que je cherche",       value: project.maintenant.cherche },
              { label: "Dernière avancée",         value: project.maintenant.avancee },
              ...(project.maintenant.bloque ? [{ label: "Ce qui bloque", value: project.maintenant.bloque }] : []),
              { label: "Prochaine étape",          value: project.maintenant.prochaine },
              { label: "Question encore ouverte",  value: project.maintenant.question },
            ].map((item, i) => (
              <div key={i} className="border-b border-border pb-8">
                <p className="text-[9px] tracking-[0.3em] uppercase text-accent mb-3">{item.label}</p>
                <p className="text-base leading-relaxed"
                  style={i === 4 ? { fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 } : {}}>
                  {item.value}
                </p>
              </div>
            ))}
            <div className="border-b border-border pb-8">
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Progression</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-px bg-border relative">
                  <div className="absolute left-0 top-0 h-px bg-accent" style={{ width: `${STATUS_PROGRESS[project.status]}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{STATUS_PROGRESS[project.status]}%</span>
                <StatusBadge status={project.status} />
              </div>
            </div>
          </div>
        )}

        {tab === "journal" && (
          <div className="px-8 lg:px-16 py-12 max-w-2xl">
            {project.journal.length === 0
              ? <p className="text-sm text-muted-foreground">Aucune entrée de journal.</p>
              : project.journal.map((entry, i) => (
                <div key={i} className="border-b border-border py-8 grid grid-cols-12 gap-5">
                  <div className="col-span-3">
                    <p className="text-[10px] text-muted-foreground">{entry.date}</p>
                    <p className={`text-[9px] tracking-widest uppercase mt-1 ${journalTypeColor(entry.type)}`}>{entry.type}</p>
                  </div>
                  <div className="col-span-9">
                    <p className="text-sm font-medium mb-2">{entry.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{entry.content}</p>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {tab === "atlas" && (
          <div className="px-8 lg:px-16 py-12">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 overflow-hidden bg-muted" style={{ height: "55vh" }}>
                {project.image && <img src={project.image} alt={project.title} className="w-full h-full object-cover" />}
              </div>
              {projectFragments.filter(f => f.image).map(f => (
                <div key={f.id} className="overflow-hidden bg-muted" style={{ height: "55vh" }}>
                  <img src={f.image} alt={f.title} className="w-full h-full object-cover" />
                </div>
              ))}
              {projectFragments.filter(f => !f.image).slice(0, 4).map(f => (
                <div key={f.id} className="bg-card border border-border p-6 flex flex-col justify-between" style={{ height: "28vh" }}>
                  <FragmentTypeBadge type={f.type} />
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">{f.number}</p>
                    <p className="text-sm leading-snug">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{f.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "recherche" && (
          <div className="px-8 lg:px-16 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-6">Références</p>
              {project.references.length === 0
                ? <p className="text-sm text-muted-foreground">Aucune référence.</p>
                : project.references.map((ref, i) => (
                  <div key={i} className="py-4 border-b border-border">
                    <p className="text-sm">{ref.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ref.author}, {ref.year}</p>
                  </div>
                ))
              }
            </div>
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-6">Fragments de recherche</p>
              {projectFragments.filter(f => ["hypothèse","question","référence"].includes(f.type)).map(f => (
                <div key={f.id} className="py-4 border-b border-border">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[9px] font-mono text-muted-foreground">{f.number}</span>
                    <FragmentTypeBadge type={f.type} />
                  </div>
                  <p className="text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "connexions" && (
          <div className="px-8 lg:px-16 py-12">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-8">Projets liés par thème</p>
            <div className="grid grid-cols-1 md:grid-cols-3 border-l border-t border-border">
              {related.map(p => (
                <div key={p.id} className="relative border-r border-b border-border overflow-hidden cursor-pointer group"
                  style={{ height: "42vh" }} onClick={() => navigate(`projet/${p.id}`)}
                  onMouseEnter={p.image ? e => onEnter(p.image, e) : undefined}
                  onMouseMove={p.image ? e => onMove(p.image, e) : undefined}
                  onMouseLeave={onLeave}>
                  {p.image && <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <StatusBadge status={p.status} />
                    <p className="text-white text-lg mt-3 mb-2">{p.title}</p>
                    <div className="flex flex-wrap gap-1">
                      {p.themes.filter(t => project.themes.includes(t)).map(t => (
                        <span key={t} className="text-[9px] text-white/55 border border-white/25 px-1 py-0.5">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "synthèse" && (
          <div className="px-8 lg:px-16 py-12 max-w-2xl">
            <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-8">Version dossier</p>
            {[
              { label: "Présentation",  value: project.description },
              { label: "Intention",     value: project.manifeste },
              { label: "Médiums",       value: project.tags.join(", ") },
              { label: "Avancement",    value: `${project.status} — ${STATUS_PROGRESS[project.status]}%` },
              { label: "Mise à jour",   value: project.lastUpdated },
              { label: "Collaborations",value: project.status === "terminé" ? "Projet terminé." : "Résidences, productions, co-créations." },
            ].map(item => (
              <div key={item.label} className="border-b border-border pb-7 mb-7">
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3">{item.label}</p>
                <p className="text-sm leading-relaxed">{item.value}</p>
              </div>
            ))}
            <button onClick={() => navigate("contact")} className="text-[9px] tracking-widest uppercase hover:text-accent transition-colors">Prendre contact →</button>
          </div>
        )}
      </motion.div>

      {next && (
        <div className="relative overflow-hidden cursor-pointer group border-t border-border" style={{ height: "32vh" }}
          onClick={() => navigate(`projet/${next.id}`)}>
          {next.image && <img src={next.image} alt={next.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
          <div className="absolute inset-0 bg-foreground/50 group-hover:bg-foreground/40 transition-colors duration-400" />
          <div className="absolute inset-0 flex items-center justify-between px-8 lg:px-16">
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/45 mb-3">Projet suivant</p>
              <p className="text-3xl lg:text-5xl font-light text-white">{next.title}</p>
            </div>
            <span className="text-white/50 text-4xl">→</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: Fragments ──────────────────────────────────────────────────────────

function PageFragments({ addToFil, fragments, projects }: {
  addToFil: (id: string) => void; fragments: Fragment[]; projects: Project[];
}) {
  const [filterType, setFilterType] = useState<FragmentType | null>(null);
  const [selected, setSelected]     = useState<Fragment | null>(null);
  const [view, setView]             = useState<"grid" | "list">("grid");
  const types   = [...new Set(fragments.map(f => f.type))] as FragmentType[];
  const visible = filterType ? fragments.filter(f => f.type === filterType) : fragments;

  return (
    <div className="pt-12 min-h-screen flex">
      <div className={`flex-1 transition-all duration-300 ${selected ? "lg:mr-96" : ""}`}>
        <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border">
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Système</p>
          <h2 className="text-5xl lg:text-8xl font-light leading-none mb-10"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
            Fragments
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 mr-2">
              {(["grid","list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={`p-1.5 transition-opacity ${view === v ? "opacity-100" : "opacity-30 hover:opacity-60"}`}>
                  {v === "grid" ? <Grid size={14} /> : <List size={14} />}
                </button>
              ))}
            </div>
            <button onClick={() => setFilterType(null)}
              className={`text-[9px] tracking-widest uppercase px-2.5 py-1 border transition-colors ${!filterType ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
              Tout
            </button>
            {types.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`text-[9px] tracking-widest uppercase px-2.5 py-1 border transition-colors ${filterType === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border">
            {visible.map(f => (
              <button key={f.id} onClick={() => setSelected(selected?.id === f.id ? null : f)}
                className={`border-r border-b border-border text-left group overflow-hidden ${selected?.id === f.id ? "bg-card" : "hover:bg-card"} transition-colors`}>
                {f.image ? (
                  <div className="relative overflow-hidden" style={{ height: "240px" }}>
                    <img src={f.image} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/25 transition-colors duration-400" />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <FragmentTypeBadge type={f.type} />
                      <span className="text-[9px] font-mono text-white/70">{f.number}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-400">
                      <p className="text-white text-sm leading-snug">{f.title}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 flex items-center justify-center border-b border-border" style={{ height: "100px" }}>
                    <span className="text-[10px] font-mono text-muted-foreground">{f.number}</span>
                  </div>
                )}
                <div className="p-5">
                  {!f.image && (
                    <div className="flex items-center justify-between mb-2">
                      <FragmentTypeBadge type={f.type} />
                      <span className="text-[9px] font-mono text-muted-foreground">{f.number}</span>
                    </div>
                  )}
                  <p className="text-sm leading-snug mb-2">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{f.content}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">{f.date}</span>
                    <span className="text-[9px] tracking-widest uppercase text-muted-foreground border border-border px-1 py-0.5">{f.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="border-t border-border">
            {visible.map(f => (
              <button key={f.id} onClick={() => setSelected(selected?.id === f.id ? null : f)}
                className={`w-full text-left border-b border-border ${selected?.id === f.id ? "bg-card" : "hover:bg-card"} transition-colors`}>
                <div className="hidden md:grid gap-x-6 px-8 lg:px-16 py-4 items-center"
                  style={{ gridTemplateColumns: "5rem 8rem 1fr 2fr auto" }}>
                  <span className="text-[9px] font-mono text-muted-foreground">{f.number}</span>
                  <FragmentTypeBadge type={f.type} />
                  <span className="text-sm">{f.title}</span>
                  <span className="text-xs text-muted-foreground truncate">{f.content}</span>
                  <span className="text-[9px] text-muted-foreground">{f.date}</span>
                </div>
                <div className="md:hidden px-6 py-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">{f.title}</span>
                    <span className="text-[9px] font-mono text-muted-foreground">{f.number}</span>
                  </div>
                  <FragmentTypeBadge type={f.type} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="hidden lg:flex fixed right-0 top-12 bottom-0 w-96 bg-background border-l border-border flex-col z-30">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-muted-foreground">{selected.number}</span>
              <FragmentTypeBadge type={selected.type} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => addToFil(selected.id)} className="text-[9px] tracking-widest uppercase text-muted-foreground hover:text-accent transition-colors">+ Fil</button>
              <button onClick={() => setSelected(null)} className="opacity-40 hover:opacity-80 transition-opacity"><X size={14} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selected.image && (
              <div className="w-full overflow-hidden" style={{ height: "280px" }}>
                <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="px-6 py-6">
              <p className="text-xs text-muted-foreground mb-4">{selected.date}</p>
              <h3 className="text-xl mb-4 leading-snug">{selected.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                {selected.content}
              </p>
              <div className="border-t border-border pt-5 space-y-1 mb-5">
                <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-3">Projets liés</p>
                {selected.projectIds.map(pid => {
                  const p = projects.find(pr => pr.id === pid);
                  return p ? <p key={pid} className="text-xs">{p.title}</p> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-1">
                {selected.keywords.map(k => (
                  <span key={k} className="text-[9px] border border-border px-1.5 py-0.5 text-muted-foreground">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: Constellation ──────────────────────────────────────────────────────

function PageConstellation({ navigate, projects }: { navigate: (p: string) => void; projects: Project[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  const edges: { from: string; to: string }[] = [];
  projects.forEach(project => {
    const pos = PROJECT_NODE_POSITIONS[project.id];
    if (!pos) return;
    project.themes.forEach(theme => {
      const themeNode = CONSTELLATION_THEME_NODES.find(n => n.id === theme);
      if (themeNode) edges.push({ from: project.id, to: theme });
    });
  });
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const shared = projects[i].themes.some(t => projects[j].themes.includes(t));
      if (shared && PROJECT_NODE_POSITIONS[projects[i].id] && PROJECT_NODE_POSITIONS[projects[j].id]) {
        edges.push({ from: projects[i].id, to: projects[j].id });
      }
    }
  }

  const getPos = (id: string) => PROJECT_NODE_POSITIONS[id] ?? CONSTELLATION_THEME_NODES.find(n => n.id === id);
  const hoveredProject = hovered ? projects.find(p => p.id === hovered) : null;

  return (
    <div className="pt-12 min-h-screen">
      <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border flex items-end justify-between">
        <div>
          <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Vue</p>
          <h2 className="text-5xl lg:text-7xl font-light leading-none"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
            Constellation
          </h2>
        </div>
        <p className="text-xs text-muted-foreground pb-1">Survolez · cliquez pour ouvrir</p>
      </div>

      <div className="relative">
        {hoveredProject?.image && (
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            <img src={hoveredProject.image} alt="" className="w-full h-full object-cover opacity-10 transition-opacity duration-500" />
          </div>
        )}
        <svg viewBox="0 0 760 480" className="w-full relative z-10" style={{ maxHeight: "65vh" }}>
          {edges.map((edge, i) => {
            const from = getPos(edge.from);
            const to   = getPos(edge.to);
            if (!from || !to) return null;
            const isHighlighted = hovered && (hovered === edge.from || hovered === edge.to);
            return (
              <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={isHighlighted ? "#0A0A0A" : "#0A0A0A"}
                strokeOpacity={isHighlighted ? 0.6 : 0.08}
                strokeWidth={isHighlighted ? 1.5 : 1} />
            );
          })}
          {CONSTELLATION_THEME_NODES.map(node => {
            const connected = hovered && edges.some(e => (e.from === hovered && e.to === node.id) || (e.to === hovered && e.from === node.id));
            return (
              <g key={node.id} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} className="cursor-default">
                <circle cx={node.x} cy={node.y} r={node.r}
                  fill={connected ? "#0A0A0A" : "transparent"}
                  stroke={connected ? "#0A0A0A" : "#999999"}
                  strokeWidth={1} />
                <text x={node.x} y={node.y + node.r + 12} textAnchor="middle" fontSize="9" fill="#555555"
                  style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
                  {node.id}
                </text>
              </g>
            );
          })}
          {projects.map(project => {
            const node = PROJECT_NODE_POSITIONS[project.id];
            if (!node) return null;
            const isHov  = hovered === project.id;
            const isConn = hovered && edges.some(e => (e.from === hovered && e.to === project.id) || (e.to === hovered && e.from === project.id));
            return (
              <g key={project.id} onMouseEnter={() => setHovered(project.id)} onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`projet/${project.id}`)} className="cursor-pointer">
                <circle cx={node.x} cy={node.y} r={node.r}
                  fill={isHov ? "#0A0A0A" : isConn ? "#555555" : "#DEDEDE"}
                  stroke={isHov ? "#0A0A0A" : "#999999"} strokeWidth={1} />
                <text x={node.x} y={node.y + node.r + 14} textAnchor="middle" fontSize="10"
                  fill={isHov ? "#0A0A0A" : "#333333"}
                  style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.03em" }}>
                  {project.title.split(" ").slice(0, 2).join(" ")}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredProject && (
          <div className="absolute bottom-6 left-8 lg:left-16 bg-background border border-border p-5 max-w-xs z-20">
            <StatusBadge status={hoveredProject.status} />
            <p className="text-sm mt-3 mb-1">{hoveredProject.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{hoveredProject.question}</p>
          </div>
        )}
      </div>

      <div className="px-8 lg:px-16 py-6 border-t border-border flex flex-wrap gap-8 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-foreground/30 bg-foreground/12" /><span>Projet</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-foreground/25" /><span>Thème</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-px bg-foreground/15" /><span>Connexion</span></div>
      </div>
    </div>
  );
}

// ─── Page: Recherches ─────────────────────────────────────────────────────────

function PageRecherches({ navigate, research, projects }: {
  navigate: (p: string) => void; research: ResearchQuestion[]; projects: Project[];
}) {
  const { onEnter, onMove, onLeave, CursorEl } = useCursorImage();
  return (
    <div className="pt-12 min-h-screen">
      {CursorEl}
      <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border">
        <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Questions</p>
        <h2 className="text-5xl lg:text-8xl font-light leading-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
          Recherches
        </h2>
      </div>
      <div className="border-t border-border">
        {research.map((rq, i) => (
          <div key={rq.id} className="border-b border-border px-8 lg:px-16 py-14 grid grid-cols-1 lg:grid-cols-12 gap-6 group hover:bg-card transition-colors">
            <div className="lg:col-span-1">
              <span className="text-[9px] font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="lg:col-span-7">
              <p className="text-2xl lg:text-4xl font-light leading-tight text-foreground/85 mb-7"
                style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                {rq.question}
              </p>
              <div className="flex flex-wrap gap-2">
                {rq.projectIds.map(pid => {
                  const p = projects.find(pr => pr.id === pid);
                  return p ? (
                    <button key={pid} onClick={() => navigate(`projet/${pid}`)}
                      onMouseEnter={p.image ? e => onEnter(p.image, e) : undefined}
                      onMouseMove={p.image ? e => onMove(p.image, e) : undefined}
                      onMouseLeave={onLeave}
                      className="text-[9px] tracking-widest uppercase border border-border px-2.5 py-1 hover:border-accent hover:text-accent transition-colors text-muted-foreground">
                      {p.title}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
            <div className="lg:col-span-3 lg:col-start-10 text-right">
              <p className="text-xs text-muted-foreground">{rq.fragmentCount} fragments</p>
              <p className="text-[9px] text-muted-foreground mt-1.5">{rq.lastUpdated}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page: Textes ─────────────────────────────────────────────────────────────

function PageTextes({ navigate, texts, projects }: {
  navigate: (p: string) => void; texts: Text[]; projects: Project[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { onEnter, onMove, onLeave, CursorEl } = useCursorImage();
  return (
    <div className="pt-12 min-h-screen">
      {CursorEl}
      <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border">
        <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Bibliothèque</p>
        <h2 className="text-5xl lg:text-8xl font-light leading-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
          Textes
        </h2>
      </div>
      <div className="border-t border-border">
        {texts.map(text => {
          const isOpen  = expanded === text.id;
          const related = projects.find(p => p.id === text.relatedProjectId);
          return (
            <div key={text.id} className="border-b border-border">
              <button onClick={() => setExpanded(isOpen ? null : text.id)}
                className="group w-full text-left hover:bg-card transition-colors"
                onMouseEnter={related?.image ? e => onEnter(related.image, e) : undefined}
                onMouseMove={related?.image ? e => onMove(related.image, e) : undefined}
                onMouseLeave={onLeave}>
                <div className="hidden md:grid gap-x-6 px-8 lg:px-16 py-6 items-baseline"
                  style={{ gridTemplateColumns: "8rem 8rem 1fr 5rem" }}>
                  <span className="text-xs text-muted-foreground">{text.date}</span>
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{text.type.toLowerCase()}</span>
                  <span className="text-base group-hover:text-accent transition-colors">{text.title}</span>
                  <span className="text-xs text-muted-foreground text-right">{text.readTime}</span>
                </div>
                <div className="md:hidden px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm">{text.title}</span>
                    <span className="text-[10px] text-muted-foreground">{text.readTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{text.date} — {text.type}</p>
                </div>
              </button>
              {isOpen && (
                <div className="px-8 lg:px-16 pb-10 pt-2">
                  <div className="md:pl-[calc(8rem+8rem+3rem)] max-w-2xl space-y-5">
                    {related?.image && (
                      <div className="w-full overflow-hidden mb-6" style={{ height: "240px" }}>
                        <img src={related.image} alt={related.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-lg text-muted-foreground leading-relaxed"
                      style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontWeight: 300 }}>
                      {text.excerpt}
                    </p>
                    <p className="text-sm leading-relaxed">{text.body}</p>
                    {related && (
                      <button onClick={() => navigate(`projet/${related.id}`)} className="text-[9px] tracking-widest uppercase text-accent hover:opacity-70 transition-opacity">
                        → Projet lié : {related.title}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page: À propos ───────────────────────────────────────────────────────────

function PageAPropos({ navigate, projects }: { navigate: (p: string) => void; projects: Project[] }) {
  const featured = projects[0];
  return (
    <div className="pt-12 min-h-screen">
      <div className="relative overflow-hidden" style={{ height: "50vh" }}>
        {featured?.image && <img src={featured.image} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="absolute bottom-0 left-0 right-0 px-8 lg:px-16 pb-14">
          <p className="text-[9px] tracking-[0.3em] uppercase text-white/45 mb-4">À propos</p>
          <p className="text-5xl lg:text-7xl font-light text-white leading-none"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
            Mademo studio
          </p>
          <p className="text-white/50 text-xs mt-4 tracking-widest uppercase">Artiste · Designer · Photographe · Autrice</p>
        </div>
      </div>
      <div className="px-8 lg:px-16 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-border">
        <div className="lg:col-span-6 space-y-6">
          <p className="text-base lg:text-lg leading-relaxed">Mademo studio est une artiste, designer, photographe et autrice dont le travail traverse l'image, le corps, la matière, la politique et les formes sensibles du vivant.</p>
          <p className="text-sm text-muted-foreground leading-relaxed">Ce site fonctionne comme un atelier vivant, un carnet de recherche public et une archive artistique évolutive.</p>
          <button onClick={() => navigate("contact")} className="text-[9px] tracking-widest uppercase hover:text-accent transition-colors">Prendre contact →</button>
        </div>
        <div className="lg:col-span-4 lg:col-start-9 space-y-8">
          {[
            { label: "Pratiques", items: ["Installation","Animation","Joaillerie","Direction artistique","Photographie","Écriture & recherche"] },
            { label: "Disponible pour", items: ["Collaborations artistiques","Résidences","Commandes","Direction artistique"] },
          ].map(block => (
            <div key={block.label}>
              <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">{block.label}</p>
              <ul className="space-y-2">{block.items.map(item => <li key={item} className="text-sm text-muted-foreground">{item}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page: Contact ────────────────────────────────────────────────────────────

function PageContact() {
  return (
    <div className="pt-12 min-h-screen">
      <div className="px-8 lg:px-16 pt-16 pb-10 border-b border-border">
        <p className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mb-4">Écrire</p>
        <h2 className="text-5xl lg:text-7xl font-light leading-none"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}>
          Contact
        </h2>
      </div>
      <div className="px-8 lg:px-16 py-12 max-w-xl">
        <p className="text-sm text-muted-foreground leading-relaxed mb-12">Pour collaborations, résidences, commandes ou simplement pour échanger.</p>
        {[
          { label: "Email",     value: "mademo@studio.fr",  href: "mailto:mademo@studio.fr" },
          { label: "Instagram", value: "@mademo.studio",    href: "#" },
          { label: "Vimeo",     value: "vimeo.com/mademo",  href: "#" },
        ].map(item => (
          <a key={item.label} href={item.href} className="group flex items-baseline justify-between py-6 border-b border-border">
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground">{item.label}</span>
            <span className="text-lg group-hover:text-accent transition-colors">{item.value}</span>
          </a>
        ))}
        <p className="text-xs text-muted-foreground mt-10">Basée à Paris.</p>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page,       setPage]       = useState("atelier");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filOpen,    setFilOpen]    = useState(false);
  const [fil,        setFil]        = useState<string[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { projects, fragments, research, texts, status } = useData();

  const navigate    = useCallback((p: string) => { setPage(p); window.scrollTo({ top: 0, behavior: "instant" }); }, []);
  const addToFil    = useCallback((id: string) => { setFil(prev => prev.includes(id) ? prev : [...prev, id]); setFilOpen(true); }, []);
  const removeFromFil = useCallback((id: string) => { setFil(prev => prev.filter(x => x !== id)); }, []);

  const currentProject = projects.find(p => `projet/${p.id}` === page);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav page={page} navigate={navigate} filCount={0} onSearchOpen={() => {}} onFilOpen={() => {}} />
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav page={page} navigate={navigate} filCount={fil.length} onSearchOpen={() => setSearchOpen(true)} onFilOpen={() => setFilOpen(true)} />

      {searchOpen && (
        <SearchModal onClose={() => setSearchOpen(false)} navigate={navigate}
          projects={projects} fragments={fragments} texts={texts} />
      )}
      {filOpen && (
        <FilDeRecherche items={fil} onClose={() => setFilOpen(false)} onRemove={removeFromFil}
          navigate={navigate} projects={projects} fragments={fragments} />
      )}
      {status === "fallback" && window.MADEMO_CONFIG && !bannerDismissed && (
        <FallbackBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        {page === "atelier"         && <PageAtelier navigate={navigate} addToFil={addToFil} projects={projects} fragments={fragments} research={research} />}
        {page === "projets"         && <PageProjets navigate={navigate} addToFil={addToFil} projects={projects} />}
        {currentProject             && <PageProjetDetail project={currentProject} navigate={navigate} addToFil={addToFil} projects={projects} fragments={fragments} />}
        {page === "fragments"       && <PageFragments addToFil={addToFil} fragments={fragments} projects={projects} />}
        {page === "constellation"   && <PageConstellation navigate={navigate} projects={projects} />}
        {page === "recherches"      && <PageRecherches navigate={navigate} research={research} projects={projects} />}
        {page === "textes"          && <PageTextes navigate={navigate} texts={texts} projects={projects} />}
        {page === "a-propos"        && <PageAPropos navigate={navigate} projects={projects} />}
        {page === "contact"         && <PageContact />}
      </motion.div>
    </div>
  );
}
