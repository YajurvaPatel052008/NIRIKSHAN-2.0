import { ArrowRight, FileSearch, ShieldCheck, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 border-b border-border pb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
          Procurement intelligence
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Welcome to NIRIKSHAN
        </h1>
        <p className="mt-3 max-w-2xl text-textMuted">
          Discover applicable Indian Standards for procurement specifications
          with an evidence-backed recommendation workflow.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: FileSearch,
            title: "Start an analysis",
            text: "Upload a specification or describe your procurement need."
          },
          {
            icon: Sparkles,
            title: "Get recommendations",
            text: "Review ranked standards, relationships, and evidence."
          },
          {
            icon: ShieldCheck,
            title: "Review with confidence",
            text: "Track decisions and export tender-ready specifications."
          }
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="border border-border bg-surface p-6">
            <Icon className="mb-5 text-accent" size={24} aria-hidden="true" />
            <h2 className="font-semibold text-text">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-textMuted">{text}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Coming next <ArrowRight size={15} aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
