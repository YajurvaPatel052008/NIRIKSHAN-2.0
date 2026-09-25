import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  GitBranch,
  Landmark,
  SearchCheck,
  ShieldCheck
} from "lucide-react";

const steps = [
  ["01", "Input Requirement", "Type a specification or upload a tender/PDF.", FileSearch],
  ["02", "AI Extraction", "Groq-powered extraction of product, use case, and technical parameters.", SearchCheck],
  ["03", "Semantic Match", "pgvector search finds the most relevant Indian Standards.", ClipboardCheck],
  ["04", "Graph Expansion", "NetworkX traces allied, normative, and certification-linked standards.", GitBranch],
  ["05", "Review & Export", "Officer reviews, accepts or edits recommendations, and exports a tender-ready specification.", ShieldCheck]
];

const benefits = [
  ["Semantic, Not Keyword Matching", "Understand product context and technical requirements instead of relying on exact word matches."],
  ["Evidence-Backed Recommendations", "See the matched requirement fields, supporting evidence, and confidence behind every suggestion."],
  ["Human Officer Stays in Control", "Keep final decisions with the officer through review, accept, edit, and reject workflows."],
  ["Audit Trail Built In", "Track analysis, review, and export activity for accountable procurement decisions."]
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="NIRIKSHAN home">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-white">
              <Landmark size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-widest text-primary">NIRIKSHAN</span>
              <span className="block text-xs text-textMuted">AI Standards Engine</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-textMuted md:flex" aria-label="Marketing navigation">
            <a href="#home" className="hover:text-primary">Home</a>
            <a href="#about" className="hover:text-primary">About</a>
            <a href="#how-it-works" className="hover:text-primary">How It Works</a>
          </nav>
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Login
          </Link>
        </div>
      </header>

      <main id="home">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-28">
            <div>
              <p className="mb-5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Government e-Procurement Support Platform
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-primary md:text-6xl">
                Recommend the Right Indian Standards. Instantly.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-textMuted">
                NIRIKSHAN analyzes procurement specifications and recommends applicable IS standards, allied references, and certification requirements with evidence for every decision.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Login to Dashboard
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-primary underline decoration-accent underline-offset-4">
                  See How It Works
                </a>
              </div>
            </div>
            <div className="border border-border bg-bg p-6 md:p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-textMuted">SIH26108 / Prototype workflow</p>
              <div className="mt-6 space-y-3">
                {["Requirement specification", "Applicable IS standards", "Evidence and relationships", "Tender-ready output"].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 border border-border bg-surface px-4 py-4">
                    <span className="font-mono text-sm font-semibold text-accent">0{index + 1}</span>
                    <span className="text-sm font-medium text-text">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-20 lg:px-8">
          <SectionHeading eyebrow="The workflow" title="From specification to defensible standards guidance." text="A transparent pipeline designed for procurement officers, reviewers, and administrators." />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {steps.map(([number, title, text, Icon]) => (
              <div key={number} className="rounded-md border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-accent">{number}</span>
                  <Icon size={20} className="text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-7 font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-textMuted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <SectionHeading eyebrow="Why NIRIKSHAN" title="Built to support better procurement decisions." text="A practical recommendation engine that keeps standards intelligence transparent and officers in control." />
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map(([title, text]) => (
                <div key={title} className="rounded-md border border-border bg-bg p-6">
                  <h3 className="font-semibold text-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-textMuted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid border border-border bg-primary text-white md:grid-cols-3">
            {[
              ["15+", "Sample Standards Indexed"],
              ["3", "Role-Based Access Levels"],
              ["SIH26108", "Prototype Build"]
            ].map(([value, label]) => (
              <div key={label} className="border-b border-white/20 p-7 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <p className="font-mono text-2xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-sm text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-primary text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <p className="font-semibold tracking-widest">NIRIKSHAN</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">AI-powered Indian Standards recommendations for evidence-backed procurement specifications.</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Platform</p>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm text-white/70">
              <a href="#home" className="hover:text-white">Home</a>
              <a href="#how-it-works" className="hover:text-white">How It Works</a>
              <Link href="/login" className="hover:text-white">Login</Link>
            </div>
          </div>
          <p className="text-sm leading-6 text-white/60">Smart India Hackathon (SIH26108) prototype. Not for production use.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-primary md:text-4xl">{title}</h2>
      <p className="mt-4 leading-7 text-textMuted">{text}</p>
    </div>
  );
}
