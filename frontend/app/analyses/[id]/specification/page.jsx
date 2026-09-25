"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Download, Loader2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function SpecificationPage() {
  const { id } = useParams();
  const [specification, setSpecification] = useState(null);
  const [preview, setPreview] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .post(`/api/analyses/${id}/export?format=json`)
      .then(({ data }) => {
        setSpecification(data);
        setPreview(JSON.stringify(data, null, 2));
      })
      .catch((requestError) => {
        setError(
          requestError.response?.data?.detail ||
            "Unable to generate the specification preview. Accept or edit at least one recommendation first."
        );
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const downloadJson = () => {
    try {
      const parsed = JSON.parse(preview);
      downloadBlob(
        new Blob([JSON.stringify(parsed, null, 2)], { type: "application/json" }),
        "NIRIKSHAN-tender-specification.json"
      );
      setSaved(false);
    } catch {
      setError("The preview is not valid JSON. Correct it before downloading.");
    }
  };

  const downloadDocx = async () => {
    setIsDownloading("docx");
    setError("");
    try {
      const response = await api.post(`/api/analyses/${id}/export?format=docx`, null, {
        responseType: "blob"
      });
      downloadBlob(response.data, "NIRIKSHAN-tender-specification.docx");
    } catch {
      setError("Unable to download the Word document. Please try again.");
    } finally {
      setIsDownloading("");
    }
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

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/analyses/${id}/results`} className="inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text">
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
          Review the accepted standards block before downloading or sharing it.
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
          <section className="border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text">Product and use-case summary</h2>
            <p className="mt-3 text-sm leading-6 text-text">
              {specification.product_summary || specification.summary || "No product summary provided."}
            </p>
          </section>
          <section className="border border-border bg-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-text">Editable specification JSON</h2>
                <p className="mt-1 text-sm text-textMuted">
                  Make final wording adjustments here, then download the approved format.
                </p>
              </div>
              {saved && <span className="text-sm font-semibold text-success">Preview updated</span>}
            </div>
            <textarea
              value={preview}
              onChange={(event) => {
                setPreview(event.target.value);
                setSaved(false);
              }}
              className="input-control mt-5 min-h-[420px] font-mono text-xs leading-6"
              aria-label="Editable tender specification JSON"
            />
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setSaved(true)} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-textMuted hover:border-accent hover:text-text">
                <Save size={16} aria-hidden="true" />
                Save preview
              </button>
              <button type="button" onClick={downloadJson} className="inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">
                <Download size={16} aria-hidden="true" />
                Download as JSON
              </button>
              <button type="button" onClick={downloadDocx} disabled={Boolean(isDownloading)} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryDark disabled:opacity-60">
                {isDownloading === "docx" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download as Word (.docx)
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
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
