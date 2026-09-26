"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Save, X } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import AdminErrorMessage from "@/components/AdminErrorMessage";
import api from "@/lib/api";

const relationshipTypes = [
  "normative_reference",
  "test_method",
  "terminology",
  "safety",
  "installation",
  "related_product"
];

const emptyForm = {
  is_number: "",
  title: "",
  scope: "",
  product_domain: "",
  aliases: "",
  technical_parameters: "{}",
  version_edition: ""
};

export default function AdminStandardsPage() {
  const [standards, setStandards] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [relationship, setRelationship] = useState({
    fromId: "",
    toId: "",
    type: relationshipTypes[0]
  });
  const [relationshipMessage, setRelationshipMessage] = useState("");

  const loadStandards = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/admin/standards");
      setStandards(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Unable to load standards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStandards();
  }, [loadStandards]);

  const filteredStandards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return standards;
    return standards.filter((standard) =>
      [standard.is_number, standard.title, standard.product_domain, standard.scope]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [search, standards]);

  const startForm = (standard = null) => {
    setForm(standard
      ? {
          id: standard.id,
          is_number: standard.is_number || "",
          title: standard.title || "",
          scope: standard.scope || "",
          product_domain: standard.product_domain || "",
          aliases: (standard.aliases || []).join(", "),
          technical_parameters: JSON.stringify(standard.technical_parameters || {}, null, 2),
          version_edition: standard.version_edition || "",
          amendments: standard.amendments || [],
          certification_metadata: standard.certification_metadata || {},
          source_reference: standard.source_reference || null
        }
      : { ...emptyForm });
    setFormError("");
  };

  const saveStandard = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      let technicalParameters;
      try {
        technicalParameters = JSON.parse(form.technical_parameters || "{}");
      } catch {
        throw new Error("Technical parameters must be valid JSON.");
      }
      if (!technicalParameters || Array.isArray(technicalParameters) || typeof technicalParameters !== "object") {
        throw new Error("Technical parameters must be a JSON object.");
      }
      const payload = {
        is_number: form.is_number.trim(),
        title: form.title.trim(),
        scope: form.scope.trim() || null,
        product_domain: form.product_domain.trim() || null,
        aliases: form.aliases.split(",").map((item) => item.trim()).filter(Boolean),
        technical_parameters: technicalParameters,
        version_edition: form.version_edition.trim() || null,
        amendments: form.amendments || [],
        certification_metadata: form.certification_metadata || {},
        source_reference: form.source_reference || "Added by administrator"
      };
      if (!payload.is_number || !payload.title) {
        throw new Error("IS number and title are required.");
      }
      if (form.id) {
        await api.put(`/api/admin/standards/${form.id}`, payload);
      } else {
        await api.post("/api/admin/standards", payload);
      }
      setForm(null);
      await loadStandards();
    } catch (requestError) {
      setFormError(requestError.response?.data?.detail || requestError.message || "Unable to save standard.");
    } finally {
      setSaving(false);
    }
  };

  const addRelationship = async (event) => {
    event.preventDefault();
    setRelationshipMessage("");
    try {
      await api.post(`/api/admin/standards/${relationship.fromId}/relationships`, {
        to_standard_id: Number(relationship.toId),
        relationship_type: relationship.type
      });
      setRelationshipMessage("Relationship added.");
    } catch (requestError) {
      setRelationshipMessage(requestError.response?.data?.detail || "Unable to add relationship.");
    }
  };

  return (
    <AdminGuard>
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-textMuted hover:text-text">
          <ArrowLeft size={16} aria-hidden="true" /> Admin dashboard
        </Link>
        <header className="mb-6 mt-5 flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Administration</p>
            <h1 className="text-3xl font-semibold tracking-tight text-text">Standards</h1>
            <p className="mt-2 text-textMuted">Manage the searchable standards corpus and relationships.</p>
          </div>
          <button type="button" onClick={() => startForm()} className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-primaryDark">
            <Plus size={17} aria-hidden="true" /> Add Standard
          </button>
        </header>

        {error && <AdminErrorMessage message={error} />}

        {form && (
          <section className="mb-6 border border-border bg-surface p-5" aria-labelledby="standard-form-title">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="standard-form-title" className="font-semibold text-text">{form.id ? "Edit Standard" : "Add Standard"}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close standard form" className="rounded-md p-2 text-textMuted hover:bg-bg"><X size={18} /></button>
            </div>
            <form onSubmit={saveStandard} className="grid gap-4 md:grid-cols-2">
              <FormField label="IS number *" value={form.is_number} onChange={(value) => setForm({ ...form, is_number: value })} required />
              <FormField label="Title *" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
              <FormField label="Product domain" value={form.product_domain} onChange={(value) => setForm({ ...form, product_domain: value })} />
              <FormField label="Version / edition" value={form.version_edition} onChange={(value) => setForm({ ...form, version_edition: value })} />
              <label className="text-sm text-textMuted md:col-span-2">
                Scope
                <textarea className="input-control mt-1 min-h-20" value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} />
              </label>
              <label className="text-sm text-textMuted md:col-span-2">
                Aliases (comma-separated)
                <input className="input-control mt-1" value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} />
              </label>
              <label className="text-sm text-textMuted md:col-span-2">
                Technical parameters (JSON object)
                <textarea className="input-control mt-1 min-h-28 font-mono" value={form.technical_parameters} onChange={(event) => setForm({ ...form, technical_parameters: event.target.value })} />
              </label>
              {formError && <p className="text-sm text-error md:col-span-2" role="alert">{formError}</p>}
              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" onClick={() => setForm(null)} className="rounded-md border border-border px-4 py-2 text-sm text-textMuted">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Save size={16} aria-hidden="true" /> {saving ? "Saving…" : "Save Standard"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mb-6 border border-border bg-surface p-5">
          <h2 className="font-semibold text-text">Add a relationship</h2>
          <form onSubmit={addRelationship} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <select className="input-control" aria-label="Source standard" value={relationship.fromId} onChange={(event) => setRelationship({ ...relationship, fromId: event.target.value })} required>
              <option value="">Select source standard</option>
              {standards.map((standard) => <option key={standard.id} value={standard.id}>{standard.is_number} — {standard.title}</option>)}
            </select>
            <select className="input-control" aria-label="Target standard" value={relationship.toId} onChange={(event) => setRelationship({ ...relationship, toId: event.target.value })} required>
              <option value="">Select target standard</option>
              {standards.map((standard) => <option key={standard.id} value={standard.id}>{standard.is_number} — {standard.title}</option>)}
            </select>
            <select className="input-control" aria-label="Relationship type" value={relationship.type} onChange={(event) => setRelationship({ ...relationship, type: event.target.value })}>
              {relationshipTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
            </select>
            <button type="submit" className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">Add</button>
          </form>
          {relationshipMessage && <p className="mt-3 text-sm text-textMuted" role="status">{relationshipMessage}</p>}
        </section>

        <section className="border border-border bg-surface">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-text">All standards</h2>
              <p className="mt-1 text-sm text-textMuted">{filteredStandards.length} of {standards.length}</p>
            </div>
            <div className="flex gap-2">
              <input className="input-control min-w-56" type="search" placeholder="Search standards…" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search standards" />
              <button type="button" onClick={loadStandards} aria-label="Refresh standards" className="rounded-md border border-border p-3 text-textMuted hover:bg-bg"><RefreshCw size={17} /></button>
            </div>
          </div>
          {loading ? <div className="p-6 text-sm text-textMuted">Loading standards…</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-border bg-bg text-xs uppercase tracking-wide text-textMuted">
                  <tr><th className="px-5 py-3">IS number</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Product domain</th><th className="px-5 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStandards.map((standard) => (
                    <tr key={standard.id} className="hover:bg-bg/70">
                      <td className="px-5 py-4 font-mono font-semibold text-primary">{standard.is_number}</td>
                      <td className="px-5 py-4 text-text">{standard.title}</td>
                      <td className="px-5 py-4 text-textMuted">{standard.product_domain || "—"}</td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => startForm(standard)} className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-primary hover:border-primary">Edit</button></td>
                    </tr>
                  ))}
                  {!filteredStandards.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-textMuted">{standards.length ? "No standards match your search." : "No standards have been added yet."}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminGuard>
  );
}

function FormField({ label, value, onChange, required = false }) {
  return (
    <label className="text-sm text-textMuted">
      {label}
      <input className="input-control mt-1" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}
