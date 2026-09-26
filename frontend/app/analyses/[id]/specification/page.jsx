"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Loader2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function SpecificationPage() {
  const { id } = useParams();
  const [specification, setSpecification] = useState(null);
  const [productSummary, setProductSummary] = useState("");
  const [standardEdits, setStandardEdits] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .post(`/api/analyses/${id}/export?format=json`)
      .then(({ data }) => {
        if (!active) return;
        setSpecification(data);
        setProductSummary(data.analysis?.product_summary || "");
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.detail ||
              "Unable to generate the specification preview. Accept or edit at least one recommendation first."
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

  const standards = useMemo(
    () => specification?.accepted_standards || [],
    [specification]
  );
  const editedSpecification = useMemo(() => {
    if (!specification) return null;
    return {
      ...specification,
      analysis: {
        ...specification.analysis,
        product_summary: productSummary
      },
      accepted_standards: standards.map((standard) => ({
        ...standard,
        ...standardEdits[standard.is_number]
      }))
    };
  }, [productSummary, specification, standardEdits, standards]);

  const markEdited = () => setSaved(false);

  const downloadJson = () => {
    if (!editedSpecification) return;
    downloadBlob(
      new Blob([JSON.stringify(editedSpecification, null, 2)], {
        type: "application/json"
      }),
      "NIRIKSHAN-tender-specification.json"
    );
  };

  const downloadDocx = async () => {
    setIsDownloading("docx");
    setError("");
    try {
      const response = await api.post(
        `/api/analyses/${id}/export?format=docx`,
        {
          product_summary: productSummary,
          standards: standards.map((standard) => ({
            is_number: standard.is_number,
            ...standardEdits[standard.is_number]
          }))
        },
        { responseType: "blob" }
      );
      downloadBlob(response.data, "NIRIKSHAN-tender-specification.docx");
    } catch {
      setError("Unable to download the Word document. Please try again.");
    } finally {
      setIsDownloading("");
    }
  };

  const updateStandard = (isNumber, field, value) => {
    setStandardEdits((current) => ({
      ...current,
      [isNumber]: {
        ...current[isNumber],
        [field]: value
      }
    }));
    markEdited();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-2 text-sm text-textMuted">
          <Loader2 size={17} className="animate-spin" aria-hidden="true" />
          Preparing tender-ready specification…
        </div>
      </div>
    );
  }

  const generatedDate = specification?.generated_at
    ? new Date(specification.generated_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
      })
    : "Date unavailable";

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/analyses/${id}/results`}
        className="inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to results
      </Link>
      <header className="mb-6 mt-6 border-b border-border pb-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
          Tender-ready output
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Specification preview
        </h1>
        <p className="mt-2 text-textMuted">
          Review and refine the accepted standards before downloading the tender document.
        </p>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {specification && (
        <div className="space-y-6">
          <article className="border border-border bg-surface p-6 md:p-8">
            <div className="border-b border-border pb-5">
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-accent">
                Procurement specification
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-primary">
                Tender-Ready Specification
              </h2>
              <p className="mt-2 text-lg font-medium text-text">
                {specification.analysis?.title || "Untitled analysis"}
              </p>
              <p className="mt-1 text-sm text-textMuted">Generated {generatedDate}</p>
            </div>

            <section className="border-b border-border py-6">
              <h3 className="text-lg font-semibold text-text">Product &amp; Use Case</h3>
              <label className="mt-3 block text-sm text-textMuted">
                Edit the procurement summary
                <textarea
                  value={productSummary}
                  onChange={(event) => {
                    setProductSummary(event.target.value);
                    markEdited();
                  }}
                  className="input-control mt-2 min-h-24 bg-white leading-6"
                  aria-label="Editable product and use case summary"
                />
              </label>
            </section>

            <section className="pt-6">
              <h3 className="text-lg font-semibold text-text">Recommended Standards</h3>
              <p className="mt-1 text-sm text-textMuted">
                Accepted standards and their tender-relevant conditions.
              </p>
              <div className="mt-4 overflow-x-auto border border-border">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="w-36 px-3 py-3 font-semibold">IS Number</th>
                      <th className="min-w-64 px-3 py-3 font-semibold">Title</th>
                      <th className="w-44 px-3 py-3 font-semibold">Relationship</th>
                      <th className="min-w-56 px-3 py-3 font-semibold">Version/Amendment Note</th>
                      <th className="min-w-56 px-3 py-3 font-semibold">Certification Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {standards.map((standard) => {
                      const row = {
                        ...standard,
                        ...standardEdits[standard.is_number]
                      };
                      return (
                        <tr key={standard.is_number} className="align-top">
                          <td className="px-3 py-3 font-mono font-semibold text-primary">
                            {standard.is_number}
                          </td>
                          <td className="px-2 py-2">
                            <EditableCell
                              label={`Title for ${standard.is_number}`}
                              value={row.title}
                              onChange={(value) => updateStandard(standard.is_number, "title", value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <EditableCell
                              label={`Relationship for ${standard.is_number}`}
                              value={row.relationship}
                              onChange={(value) => updateStandard(standard.is_number, "relationship", value)}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <EditableCell
                              label={`Version and amendment note for ${standard.is_number}`}
                              value={row.version_amendment_note}
                              onChange={(value) => updateStandard(standard.is_number, "version_amendment_note", value)}
                              multiline
                            />
                          </td>
                          <td className="px-2 py-2">
                            <EditableCell
                              label={`Certification requirement for ${standard.is_number}`}
                              value={row.certification_requirement}
                              onChange={(value) => updateStandard(standard.is_number, "certification_requirement", value)}
                              multiline
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {!standards.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-textMuted">
                          No accepted standards are available for this specification.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {standards.some((standard) => standard.annotation || standardEdits[standard.is_number]?.annotation) && (
                <div className="mt-4 space-y-3">
                  {standards.map((standard) => {
                    const annotation = standardEdits[standard.is_number]?.annotation ?? standard.annotation;
                    if (!annotation) return null;
                    return (
                      <label key={standard.is_number} className="block border-l-2 border-accent bg-bg px-4 py-3 text-sm text-textMuted">
                        Officer note for <span className="font-mono font-semibold text-primary">{standard.is_number}</span>
                        <textarea
                          value={annotation}
                          onChange={(event) => updateStandard(standard.is_number, "annotation", event.target.value)}
                          className="input-control mt-2 min-h-16 bg-white"
                          aria-label={`Officer note for ${standard.is_number}`}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          </article>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-textMuted">
              {saved ? "Preview edits are ready for export." : "Edits apply to downloaded files."}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setSaved(true)}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-textMuted hover:border-accent hover:text-text"
              >
                <Save size={16} aria-hidden="true" />
                Save preview
              </button>
              <button
                type="button"
                onClick={downloadJson}
                className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
              >
                <Download size={16} aria-hidden="true" />
                Download raw data (.json)
              </button>
              <button
                type="button"
                onClick={downloadDocx}
                disabled={Boolean(isDownloading)}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-primaryDark disabled:opacity-60"
              >
                {isDownloading === "docx" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download as Word (.docx)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableCell({ label, value, onChange, multiline = false }) {
  const shared = "w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-sm leading-5 text-text hover:border-border focus:border-accent focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent";
  if (multiline) {
    return (
      <textarea
        aria-label={label}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${shared} min-h-20 resize-y`}
      />
    );
  }
  return (
    <input
      aria-label={label}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      className={shared}
    />
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
