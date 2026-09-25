"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

const emptyParameter = { name: "", value: "", unit: "" };

export default function ReviewAnalysisPage() {
  const { id } = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { isDirty }
  } = useForm({
    defaultValues: requirementDefaults()
  });
  const parameters = useFieldArray({
    control,
    name: "technical_parameters"
  });

  useEffect(() => {
    if (!id) return;
    let active = true;
    const loadAnalysis = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get(`/api/analyses/${id}`);
        if (!active) return;
        setAnalysis(data);
        reset(requirementDefaults(data.extracted_requirements));
      } catch (error) {
        if (!active) return;
        setLoadError(
          error.response?.status === 404
            ? "This analysis could not be found, or the backend GET /api/analyses/{id} endpoint is not available yet."
            : "Unable to load this analysis. Please try again."
        );
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadAnalysis();
    return () => {
      active = false;
    };
  }, [id, reset]);

  const saveRequirements = async (values) => {
    setIsSaving(true);
    setSaveError("");
    const extractedRequirements = normalizeRequirements(values);
    try {
      const { data } = await api.patch(`/api/analyses/${id}`, {
        extracted_requirements: extractedRequirements
      });
      setAnalysis((current) => ({ ...current, ...data, extracted_requirements: extractedRequirements }));
      reset(requirementDefaults(extractedRequirements));
      return true;
    } catch (error) {
      setSaveError(
        error.response?.status === 404
          ? "Saving edits is not available yet because the backend PATCH /api/analyses/{id} endpoint is missing."
          : error.response?.data?.detail || "We could not save your edits. Please try again."
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const runStandardsAnalysis = async (values) => {
    setSaveError("");
    setIsRunning(true);
    try {
      if (isDirty && !(await saveRequirements(values))) {
        return;
      }
      await api.post(`/api/analyses/${id}/run`);
      router.push(`/analyses/${id}/results`);
    } catch (error) {
      setSaveError(
        error.response?.data?.detail ||
          "Standards analysis could not be completed. Please try again."
      );
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) return <ReviewSkeleton />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-textMuted">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
        <div className="mt-8 flex items-start gap-3 border border-error/30 bg-error/5 p-5 text-sm text-error" role="alert">
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  const missingFields = analysis?.extracted_requirements?.ambiguous_or_missing_fields || [];

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-textMuted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to dashboard
      </Link>
      <div className="mb-8 mt-6">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">
          Requirement review
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {analysis.title}
        </h1>
        <p className="mt-2 text-textMuted">
          Confirm the extracted requirements and resolve any missing details before matching standards.
        </p>
      </div>

      {missingFields.length > 0 && (
        <section className="mb-6 border border-warning/40 bg-warning/5 p-5" aria-labelledby="missing-fields">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-warning" size={20} aria-hidden="true" />
            <div>
              <h2 id="missing-fields" className="font-semibold text-warning">
                Please clarify these fields before proceeding
              </h2>
              <p className="mt-1 text-sm text-text">
                The extractor could not confidently determine the following details. Add them to the form below where applicable.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text">
                {missingFields.map((field, index) => (
                  <li key={`${field}-${index}`}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit(runStandardsAnalysis)} className="space-y-6">
        <section className="border border-border bg-surface p-6">
          <SectionHeading title="Extracted requirements" />
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Product">
              <input {...register("product")} className="input-control" />
            </Field>
            <Field label="Intended use">
              <input {...register("intended_use")} className="input-control" />
            </Field>
          </div>
        </section>

        <section className="border border-border bg-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <SectionHeading title="Technical parameters" />
            <button
              type="button"
              onClick={() => parameters.append(emptyParameter)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primaryDark"
            >
              <Plus size={16} aria-hidden="true" />
              Add parameter
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {parameters.fields.length === 0 && (
              <p className="text-sm text-textMuted">No technical parameters were extracted.</p>
            )}
            {parameters.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_1fr_150px_auto]">
                <input
                  {...register(`technical_parameters.${index}.name`)}
                  className="input-control"
                  placeholder="Name"
                  aria-label={`Parameter ${index + 1} name`}
                />
                <input
                  {...register(`technical_parameters.${index}.value`)}
                  className="input-control"
                  placeholder="Value"
                  aria-label={`Parameter ${index + 1} value`}
                />
                <input
                  {...register(`technical_parameters.${index}.unit`)}
                  className="input-control"
                  placeholder="Unit"
                  aria-label={`Parameter ${index + 1} unit`}
                />
                <button
                  type="button"
                  onClick={() => parameters.remove(index)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-textMuted hover:border-error hover:text-error"
                  aria-label={`Remove parameter ${index + 1}`}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <ArrayField
            title="Safety requirements"
            name="safety_requirements"
            register={register}
            control={control}
            useFieldArray={useFieldArray}
          />
          <ArrayField
            title="Constraints"
            name="constraints"
            register={register}
            control={control}
            useFieldArray={useFieldArray}
          />
        </section>

        {saveError && (
          <div className="flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
            <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="flex flex-col justify-end gap-3 border-t border-border pt-6 sm:flex-row">
          <Link href="/dashboard" className="rounded-md border border-border px-5 py-3 text-center text-sm font-semibold text-textMuted hover:border-accent hover:text-text">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving || isRunning}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-primaryDark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {(isSaving || isRunning) && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {isSaving ? "Saving edits…" : isRunning ? "Finding applicable standards…" : "Run Standards Analysis"}
          </button>
        </div>
        {isRunning && (
          <p className="flex items-center justify-end gap-2 text-sm text-textMuted" role="status">
            <ChevronDown size={15} className="animate-bounce text-accent" aria-hidden="true" />
            Running semantic matching, graph expansion, and validation. This may take a few seconds.
          </p>
        )}
      </form>
    </div>
  );
}

function requirementDefaults(requirements = {}) {
  return {
    product: requirements.product || "",
    intended_use: requirements.intended_use || "",
    technical_parameters: Array.isArray(requirements.technical_parameters)
      ? requirements.technical_parameters.map((item) => ({
          name: item.name || "",
          value: item.value || "",
          unit: item.unit || ""
        }))
      : [],
    safety_requirements: Array.isArray(requirements.safety_requirements)
      ? requirements.safety_requirements.map((item) => ({ value: item || "" }))
      : [],
    constraints: Array.isArray(requirements.constraints)
      ? requirements.constraints.map((item) => ({ value: item || "" }))
      : []
  };
}

function normalizeRequirements(values) {
  return {
    product: values.product.trim(),
    intended_use: values.intended_use.trim(),
    technical_parameters: values.technical_parameters
      .filter((item) => item.name.trim() || item.value.trim() || item.unit.trim())
      .map((item) => ({
        name: item.name.trim(),
        value: item.value.trim(),
        unit: item.unit.trim() || null
      })),
    safety_requirements: values.safety_requirements
      .map((item) => item.value.trim())
      .filter(Boolean),
    constraints: values.constraints.map((item) => item.value.trim()).filter(Boolean),
    ambiguous_or_missing_fields: []
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-text">{label}</span>
      {children}
    </label>
  );
}

function SectionHeading({ title }) {
  return <h2 className="text-lg font-semibold text-text">{title}</h2>;
}

function ArrayField({ title, name, register, control, useFieldArray: useArray }) {
  const fields = useArray({ control, name });
  return (
    <section className="border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <SectionHeading title={title} />
        <button
          type="button"
          onClick={() => fields.append({ value: "" })}
          className="text-sm font-semibold text-primary hover:text-primaryDark"
        >
          + Add
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {fields.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`${name}.${index}.value`)}
              className="input-control"
              placeholder={`Add ${title.toLowerCase().replace(/s$/, "")}`}
            />
            <button
              type="button"
              onClick={() => fields.remove(index)}
              className="rounded-md border border-border px-3 text-textMuted hover:border-error hover:text-error"
              aria-label={`Remove ${title} item ${index + 1}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
        {fields.fields.length === 0 && (
          <p className="text-sm text-textMuted">None extracted.</p>
        )}
      </div>
    </section>
  );
}

function ReviewSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-6">
      <div className="h-5 w-32 bg-border" />
      <div className="space-y-3">
        <div className="h-4 w-36 bg-border" />
        <div className="h-10 w-2/3 bg-border" />
        <div className="h-5 w-full max-w-xl bg-border" />
      </div>
      <div className="h-24 bg-border" />
      <div className="h-56 bg-border" />
      <div className="h-48 bg-border" />
    </div>
  );
}
