"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  UploadCloud,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

const languages = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "bengali", label: "Bengali" },
  { value: "marathi", label: "Marathi" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" }
];

export default function NewAnalysisPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("text");
  const [selectedFile, setSelectedFile] = useState(null);
  const [document, setDocument] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: "",
      requirement: "",
      language: "english"
    }
  });

  const requirement = watch("requirement");
  const language = watch("language");

  const chooseFile = (file) => {
    setUploadError("");
    setDocument(null);
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setUploadError("Please choose a PDF file. Other file types are not supported here.");
      return;
    }
    setSelectedFile(file);
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setUploadError("Choose a PDF file before uploading.");
      return;
    }
    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const { data } = await api.post("/api/documents/upload", formData);
      if (!data.document_id || !data.parsed_text?.trim()) {
        throw new Error("The PDF did not contain readable text.");
      }
      setDocument(data);
    } catch (requestError) {
      setDocument(null);
      setUploadError(
        requestError.response?.data?.detail ||
          "We could not read this PDF. Check that it is not damaged or image-only."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values) => {
    setError("");
    if (activeTab === "text" && !values.requirement?.trim()) {
      setError("Enter the procurement requirement before continuing.");
      return;
    }
    if (activeTab === "upload" && !document?.document_id) {
      setError("Upload and parse a PDF before continuing.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        input_language: language
      };
      if (activeTab === "text") {
        payload.raw_text = values.requirement.trim();
      } else {
        payload.document_id = document.document_id;
      }
      const { data } = await api.post("/api/analyses", payload);
      router.push(`/analyses/${data.id}/review`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          "The analysis could not be created. Please check your input and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>

      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
          Procurement intake
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Start a new analysis
        </h1>
        <p className="mt-2 max-w-2xl text-textMuted">
          Describe a requirement or upload a tender document to identify applicable Indian Standards.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <section className="border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text">Analysis details</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <FieldError label="Analysis title" error={errors.title}>
              <input
                {...register("title", { required: "Add a title for this analysis." })}
                className="input-control"
                placeholder="e.g. PVC drinking water supply pipes"
              />
            </FieldError>
            <FieldError label="Language hint" error={errors.language}>
              <select {...register("language")} className="input-control">
                {languages.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FieldError>
          </div>
        </section>

        <section className="border border-border bg-surface">
          <div className="border-b border-border px-6 pt-5">
            <div className="flex gap-6" role="tablist" aria-label="Requirement input method">
              <TabButton
                active={activeTab === "text"}
                onClick={() => {
                  setActiveTab("text");
                  setError("");
                }}
              >
                Type a Requirement
              </TabButton>
              <TabButton
                active={activeTab === "upload"}
                onClick={() => {
                  setActiveTab("upload");
                  setError("");
                }}
              >
                Upload Tender/PDF
              </TabButton>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "text" ? (
              <FieldError label="Procurement requirement" error={errors.requirement}>
                <textarea
                  {...register("requirement", {
                    validate: (value) =>
                      value.trim().length > 0 || "Enter the procurement requirement."
                  })}
                  rows={9}
                  className="input-control resize-y"
                  placeholder="Example: Need PVC pipes for drinking water supply, 110mm diameter, for underground use."
                />
              </FieldError>
            ) : (
              <UploadPanel
                file={selectedFile}
                parsedDocument={document}
                isDragging={isDragging}
                isUploading={isUploading}
                fileInputRef={fileInputRef}
                uploadError={uploadError}
                onFile={chooseFile}
                onUpload={uploadFile}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  chooseFile(event.dataTransfer.files?.[0]);
                }}
                onClear={() => {
                  setSelectedFile(null);
                  setDocument(null);
                  setUploadError("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
            )}
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
            <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard" className="rounded-md border border-border px-5 py-3 text-sm font-semibold text-textMuted hover:border-accent hover:text-text">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? "Creating analysis…" : "Create analysis"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 pb-3 text-sm font-semibold ${
        active
          ? "border-accent text-primary"
          : "border-transparent text-textMuted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function FieldError({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-error">{error.message}</span>}
    </label>
  );
}

function UploadPanel({
  file,
  parsedDocument,
  isDragging,
  isUploading,
  fileInputRef,
  uploadError,
  onFile,
  onUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  onClear
}) {
  return (
    <div>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-accent bg-accent/5" : "border-border bg-bg"
        }`}
      >
        <UploadCloud className="mx-auto text-primary" size={32} aria-hidden="true" />
        <p className="mt-3 font-medium text-text">Drag and drop a PDF here</p>
        <p className="mt-1 text-sm text-textMuted">PDF only, including scanned tenders with OCR.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Browse files
        </button>
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 border border-border bg-surface p-4">
          <FileText className="shrink-0 text-accent" size={20} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{file.name}</p>
            <p className="text-xs text-textMuted">{formatFileSize(file.size)}</p>
          </div>
          {parsedDocument ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
              <CheckCircle2 size={15} aria-hidden="true" />
              Parsed
            </span>
          ) : (
            <button
              type="button"
              onClick={onUpload}
              disabled={isUploading}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primaryDark disabled:opacity-60"
            >
              {isUploading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {isUploading ? "Parsing…" : "Upload and parse"}
            </button>
          )}
          <button type="button" onClick={onClear} className="text-textMuted hover:text-error" aria-label="Remove selected file">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {isUploading && (
        <p className="mt-3 text-sm text-textMuted" role="status">
          Uploading and extracting text. Scanned PDFs may take a few seconds while OCR runs.
        </p>
      )}
      {uploadError && (
        <p className="mt-3 text-sm text-error" role="alert">
          {uploadError}
        </p>
      )}
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
