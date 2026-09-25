"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  GitBranch,
  Loader2,
  Pencil,
  Quote,
  ShieldCheck,
  X
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

export default function AnalysisResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [panel, setPanel] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [decisionSavingId, setDecisionSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState({});

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .get(`/api/analyses/${id}/recommendations`)
      .then(({ data }) => {
        if (active) setRecommendations(Array.isArray(data) ? data : []);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.status === 404
              ? "Recommendations were not found for this analysis."
              : "Unable to load recommendations. Please try again."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const primary = useMemo(
    () => recommendations.filter((item) => !item.relationship_type),
    [recommendations]
  );
  const related = useMemo(
    () => recommendations.filter((item) => item.relationship_type),
    [recommendations]
  );

  const openGraph = (recommendation) => {
    router.push(`/analyses/${id}/graph/${recommendation.standard_id}`);
  };

  const saveDecision = async (recommendation, decision, editedFields = null) => {
    setDecisionSavingId(recommendation.id);
    setError("");
    try {
      await api.patch(`/api/recommendations/${recommendation.id}/decision`, {
        decision,
        notes: decisionNotes[recommendation.id] || "",
        edited_fields: editedFields
      });
      setRecommendations((items) =>
        items.map((item) =>
          item.id === recommendation.id
            ? { ...item, reviewer_decision: decision }
            : item
        )
      );
      setEditingId(null);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "We could not save this review decision. Please try again."
      );
    } finally {
      setDecisionSavingId(null);
    }
  };

  const decisionCounts = recommendations.reduce(
    (counts, recommendation) => {
      const decision = recommendation.reviewer_decision || "pending";
      if (decision in counts) counts[decision] += 1;
      return counts;
    },
    { accepted: 0, edited: 0, rejected: 0, pending: 0 }
  );
  const hasApprovedRecommendation =
    decisionCounts.accepted + decisionCounts.edited > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>
      <header className="mb-8 mt-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
          Standards analysis
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Ranked recommendations
        </h1>
        <p className="mt-2 text-textMuted">
          Review evidence-backed Indian Standards matched to this procurement requirement.
        </p>
      </header>

      {!isLoading && recommendations.length > 0 && (
        <div className="mb-6 flex flex-col justify-between gap-4 border border-border bg-surface p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-text">Review progress</p>
            <p className="mt-1 text-sm text-textMuted">
              {decisionCounts.accepted} accepted, {decisionCounts.edited} edited,{" "}
              {decisionCounts.rejected} rejected, {decisionCounts.pending} pending
            </p>
          </div>
          {hasApprovedRecommendation && (
            <Link
              href={`/analyses/${id}/specification`}
              className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryDark"
            >
              Generate Tender-Ready Specification
            </Link>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {isLoading ? (
        <ResultsSkeleton />
      ) : recommendations.length === 0 ? (
        <div className="border border-border bg-surface p-10 text-center text-sm text-textMuted">
          No recommendations are available yet. Run the standards analysis from the review page first.
        </div>
      ) : (
        <div className="space-y-8">
          {primary.length > 0 && (
            <section aria-labelledby="primary-standards">
              <SectionHeading id="primary-standards" title="Primary standards" />
              <div className="mt-4 space-y-4">
                {primary.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    expanded={expandedId === recommendation.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === recommendation.id ? null : recommendation.id
                      )
                    }
                    onGraph={() => openGraph(recommendation)}
                    onPanel={(type) => setPanel({ type, recommendation })}
                    onDecision={saveDecision}
                    onEdit={(open = true) =>
                      setEditingId(open ? recommendation.id : null)
                    }
                    isEditing={editingId === recommendation.id}
                    decisionNotes={decisionNotes[recommendation.id] || ""}
                    onNotesChange={(value) =>
                      setDecisionNotes((notes) => ({
                        ...notes,
                        [recommendation.id]: value
                      }))
                    }
                    decisionSaving={decisionSavingId === recommendation.id}
                    primary
                  />
                ))}
              </div>
            </section>
          )}
          {related.length > 0 && (
            <section aria-labelledby="related-standards">
              <SectionHeading id="related-standards" title="Related standards" />
              <p className="mt-1 text-sm text-textMuted">
                Allied standards reached through the standards relationship graph.
              </p>
              <div className="mt-4 space-y-3">
                {related.map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    expanded={expandedId === recommendation.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === recommendation.id ? null : recommendation.id
                      )
                    }
                    onGraph={() => openGraph(recommendation)}
                    onPanel={(type) => setPanel({ type, recommendation })}
                    onDecision={saveDecision}
                    onEdit={(open = true) =>
                      setEditingId(open ? recommendation.id : null)
                    }
                    isEditing={editingId === recommendation.id}
                    decisionNotes={decisionNotes[recommendation.id] || ""}
                    onNotesChange={(value) =>
                      setDecisionNotes((notes) => ({
                        ...notes,
                        [recommendation.id]: value
                      }))
                    }
                    decisionSaving={decisionSavingId === recommendation.id}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {panel && (
        <DetailPanel
          panel={panel}
          graph={graph}
          graphLoading={graphLoading}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  expanded,
  onToggle,
  onGraph,
  onPanel,
  onDecision,
  onEdit,
  isEditing,
  decisionNotes,
  onNotesChange,
  decisionSaving,
  primary = false
}) {
  const confidence = normalizeScore(recommendation.confidence_score);
  const tone = confidenceTone(confidence);
  return (
    <article
      className={`border bg-surface transition-colors ${
        primary ? "border-primary/30" : "border-border"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
            #{recommendation.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="technical-code text-sm font-semibold text-primary">
                {recommendation.is_number}
              </span>
              {recommendation.relationship_type && (
                <span className="rounded-md border border-accent/30 bg-accent/5 px-2 py-1 text-xs font-semibold text-accent">
                  {formatLabel(recommendation.relationship_type)}
                </span>
              )}
            </div>
            <h3 className={`mt-1 font-semibold text-text ${primary ? "text-xl" : "text-lg"}`}>
              {recommendation.title}
            </h3>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-textMuted">
              {recommendation.explanation}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ConfidenceBadge confidence={confidence} tone={tone} />
            {expanded ? (
              <ChevronUp size={19} className="text-textMuted" aria-hidden="true" />
            ) : (
              <ChevronDown size={19} className="text-textMuted" aria-hidden="true" />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 pl-13">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
            <div
              className={`h-full ${tone.bar}`}
              style={{ width: `${confidence}%` }}
              aria-label={`Confidence ${confidence}%`}
            />
          </div>
          <span className={`text-xs font-semibold ${tone.text}`}>{confidence}% confidence</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border bg-bg/50 px-5 pb-5 pt-4">
          <p className="text-sm leading-6 text-text">{recommendation.explanation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onGraph} className="action-button">
              <GitBranch size={15} aria-hidden="true" />
              View Graph
            </button>
            <button type="button" onClick={() => onPanel("certification")} className="action-button">
              <FileCheck2 size={15} aria-hidden="true" />
              View Certification
            </button>
            <button type="button" onClick={() => onPanel("evidence")} className="action-button">
              <Quote size={15} aria-hidden="true" />
              View Evidence
            </button>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
                Review decision
              </span>
              <button
                type="button"
                disabled={decisionSaving}
                onClick={() => onDecision(recommendation, "accepted")}
                className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs font-semibold text-success disabled:opacity-60"
              >
                <Check size={14} aria-hidden="true" />
                Accept
              </button>
              <button
                type="button"
                disabled={decisionSaving}
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-60"
              >
                <Pencil size={14} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                disabled={decisionSaving}
                onClick={() => onDecision(recommendation, "rejected")}
                className="inline-flex items-center gap-1 rounded-md border border-error/30 bg-error/5 px-3 py-2 text-xs font-semibold text-error disabled:opacity-60"
              >
                <X size={14} aria-hidden="true" />
                Reject
              </button>
              {recommendation.reviewer_decision && recommendation.reviewer_decision !== "pending" && (
                <span className="ml-auto text-xs font-semibold capitalize text-textMuted">
                  Saved: {recommendation.reviewer_decision}
                </span>
              )}
            </div>
            {isEditing && (
              <div className="mt-4 border border-accent/30 bg-surface p-4">
                <label className="block">
                  <span className="text-sm font-medium text-text">Reviewer note or correction</span>
                  <textarea
                    value={decisionNotes}
                    onChange={(event) => onNotesChange(event.target.value)}
                    rows={3}
                    className="input-control mt-2"
                    placeholder="Describe the corrected relationship, scope, or procurement note."
                  />
                </label>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => onEdit(null)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-textMuted">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={decisionSaving || !decisionNotes.trim()}
                    onClick={() =>
                      onDecision(recommendation, "edited", {
                        reviewer_note: decisionNotes.trim()
                      })
                    }
                    className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {decisionSaving ? "Saving…" : "Save as edited"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function DetailPanel({ panel, graph, graphLoading, onClose }) {
  const { recommendation } = panel;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/30" role="presentation" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="technical-code text-sm font-semibold text-primary">
              {recommendation.is_number}
            </p>
            <h2 id="detail-panel-title" className="mt-1 text-xl font-semibold text-text">
              {panelTitle(panel.type)}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-textMuted hover:bg-bg hover:text-text" aria-label="Close detail panel">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {panel.type === "certification" && <CertificationContent data={recommendation.certification_guidance} />}
        {panel.type === "evidence" && <EvidenceContent recommendation={recommendation} />}
        {panel.type === "graph" && (
          <GraphContent graph={graph} loading={graphLoading} />
        )}
      </aside>
    </div>
  );
}

function CertificationContent({ data }) {
  const schemes = Array.isArray(data?.applicable_schemes)
    ? data.applicable_schemes
    : [];
  const hasMetadata = Boolean(
    schemes.length ||
      data?.notes &&
        !data.notes.toLowerCase().includes("no certification metadata available")
  );

  if (!data || !hasMetadata) {
    return (
      <div className="mt-6 border border-border bg-bg p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-textMuted" size={18} aria-hidden="true" />
          <div>
            <p className="font-medium text-text">No certification metadata available</p>
            <p className="mt-1 text-sm leading-6 text-textMuted">
              This prototype does not have evidence-backed certification guidance for this standard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex items-center justify-between gap-4 border border-border bg-bg p-4">
        <div>
          <p className="text-sm text-textMuted">Certification requirement</p>
          <p className="mt-1 font-semibold text-text">
            {data.mandatory ? "Mandatory" : "Not marked mandatory"}
          </p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-xs font-semibold ${
            data.mandatory
              ? "border-warning/30 bg-warning/5 text-warning"
              : "border-border bg-surface text-textMuted"
          }`}
        >
          {data.mandatory ? "Required" : "Advisory"}
        </span>
      </div>
      <div>
        <h3 className="font-semibold text-text">Applicable schemes</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {schemes.map((scheme) => (
            <span
              key={scheme}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${schemeTone(scheme)}`}
            >
              <ShieldCheck size={14} aria-hidden="true" />
              {schemeLabel(scheme)}
            </span>
          ))}
        </div>
      </div>
      {data.notes && (
        <div className="border-l-2 border-primary/30 pl-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Notes</p>
          <p className="mt-1 text-sm leading-6 text-textMuted">{data.notes}</p>
        </div>
      )}
    </div>
  );
}

function schemeLabel(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("bis") || normalized.includes("product certification")) {
    return "BIS Product Certification";
  }
  if (normalized.includes("crs")) return "CRS";
  if (normalized.includes("hallmark")) return "Hallmarking";
  return value;
}

function schemeTone(value) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("bis") || normalized.includes("product certification")) {
    return "border-primary/25 bg-primary/5 text-primary";
  }
  if (normalized.includes("crs")) {
    return "border-accent/30 bg-accent/5 text-accent";
  }
  if (normalized.includes("hallmark")) {
    return "border-success/30 bg-success/5 text-success";
  }
  return "border-border bg-bg text-textMuted";
}

function EvidenceContent({ recommendation }) {
  const evidence = Array.isArray(recommendation.evidence)
    ? recommendation.evidence
    : [];
  const scores = [
    {
      label: "Semantic similarity",
      value: recommendation.semantic_similarity,
      description: "How closely the requirement language matches the standard metadata."
    },
    {
      label: "Parameter coverage",
      value: recommendation.parameter_coverage,
      description: "How many extracted technical parameters are supported by this standard."
    }
  ];

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="font-semibold text-text">Why this standard matched</h3>
        {evidence.length ? (
          <div className="mt-3 space-y-3">
            {evidence.map((item, index) => {
              const text = typeof item === "string" ? item : item.text;
              const field =
                typeof item === "object" && item.field
                  ? item.field
                  : matchedField(text);
              const snippetScore =
                typeof item === "object" && item.score !== undefined
                  ? normalizeScore(item.score)
                  : null;
              return (
                <div
                  key={`${text || "evidence"}-${index}`}
                  className="border border-border bg-bg p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
                      Matched requirement field
                    </p>
                    <span className="rounded-md border border-primary/20 bg-surface px-2 py-1 text-xs font-semibold capitalize text-primary">
                      {formatLabel(field)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">{evidenceText(text)}</p>
                  {typeof item === "object" && item.source && (
                    <p className="mt-2 text-xs text-textMuted">Source: {item.source}</p>
                  )}
                  {snippetScore !== null && (
                    <p className="mt-2 text-xs font-semibold text-primary">
                      Evidence relevance: {snippetScore}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-textMuted">
            No matched text snippets were stored for this recommendation.
          </p>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-text">Match scores</h3>
        <div className="mt-3 space-y-4">
          {scores.map((score) => (
            <ScoreRow key={score.label} {...score} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, value, description }) {
  const percentage = value === undefined || value === null
    ? null
    : normalizeScore(value);
  return (
    <div className="border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text">{label}</p>
        <span className="text-sm font-bold text-primary">
          {percentage === null ? "Not provided" : `${percentage}%`}
        </span>
      </div>
      {percentage !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className={`h-full ${confidenceTone(percentage).bar}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-xs leading-5 text-textMuted">{description}</p>
    </div>
  );
}

function matchedField(value) {
  const text = String(value || "").toLowerCase();
  if (text.startsWith("product/domain=")) return "Product domain";
  if (text.includes("diameter") || text.includes("size") || text.includes("unit")) {
    return "Technical parameter";
  }
  if (text.includes("parameter") || text.includes("=")) return "Technical parameter";
  return "Retrieved evidence";
}

function evidenceText(value) {
  const text = String(value || "");
  if (text.startsWith("product/domain=")) {
    return `The requirement's product or domain aligns with ${text.slice("product/domain=".length)}.`;
  }
  return text;
}

function GraphContent({ graph, loading }) {
  if (loading) {
    return <div className="mt-6 flex items-center gap-2 text-sm text-textMuted"><Loader2 size={16} className="animate-spin" /> Loading standards graph…</div>;
  }
  if (graph?.error) return <p className="mt-6 text-sm text-error">{graph.error}</p>;
  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm text-textMuted">Connected standards and relationship mappings.</p>
      <div>
        <h3 className="font-semibold text-text">Nodes</h3>
        <ul className="mt-3 space-y-2">
          {(graph?.nodes || []).map((node) => (
            <li key={node.id} className="border border-border bg-bg p-3 text-sm">
              <span className="technical-code font-semibold text-primary">{node.is_number}</span>
              <span className="ml-2 text-text">{node.title}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-text">Relationships</h3>
        <ul className="mt-3 space-y-2 text-sm text-textMuted">
          {(graph?.edges || []).map((edge, index) => (
            <li key={`${edge.source}-${edge.target}-${index}`} className="border border-border p-3">
              {formatLabel(edge.relationship_type || edge.type || "related")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SectionHeading({ id, title }) {
  return <h2 id={id} className="text-xl font-semibold text-text">{title}</h2>;
}

function ConfidenceBadge({ confidence, tone }) {
  return <span className={`rounded-md border px-2 py-1 text-xs font-bold ${tone.badge}`}>{confidence}%</span>;
}

function confidenceTone(score) {
  if (score >= 75) return { bar: "bg-success", text: "text-success", badge: "border-success/30 bg-success/5 text-success" };
  if (score >= 50) return { bar: "bg-warning", text: "text-warning", badge: "border-warning/30 bg-warning/5 text-warning" };
  return { bar: "bg-error", text: "text-error", badge: "border-error/30 bg-error/5 text-error" };
}

function normalizeScore(value) {
  const number = Number(value || 0);
  return Math.round(Math.max(0, Math.min(100, number <= 1 ? number * 100 : number)));
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ");
}

function panelTitle(type) {
  if (type === "certification") return "Certification guidance";
  if (type === "evidence") return "Matched evidence";
  return "Standards graph";
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading recommendations">
      {[1, 2, 3].map((item) => (
        <div key={item} className="border border-border bg-surface p-6">
          <div className="flex gap-4">
            <div className="h-9 w-9 animate-pulse bg-bg" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 animate-pulse bg-bg" />
              <div className="h-6 w-2/3 animate-pulse bg-bg" />
              <div className="h-4 w-full animate-pulse bg-bg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
