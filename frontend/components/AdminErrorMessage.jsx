import { AlertCircle } from "lucide-react";

export default function AdminErrorMessage({ message }) {
  return (
    <div className="mb-5 flex items-start gap-3 border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
