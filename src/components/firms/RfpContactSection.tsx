"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

interface RfpContact {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

interface RfpContactSectionProps {
  firmId: string;
  contacts: RfpContact[];
  canEdit: boolean;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-scg-500 focus:outline-none";

export function RfpContactSection({ firmId, contacts, canEdit }: RfpContactSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const openForm = (contact?: RfpContact) => {
    setEditingId(contact?.id ?? null);
    setName(contact?.name ?? "");
    setEmail(contact?.email ?? "");
    setContactRole(contact?.role ?? "");
    setError(null);
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/firms/${firmId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: name.trim(),
          email: email.trim(),
          ...(contactRole.trim() ? { role: contactRole.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Could not save the contact. Check the name and email."
        );
        return;
      }
      closeForm();
      router.refresh();
    } catch {
      setError("Could not save the contact. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="surface p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <Mail size={14} className="mr-2 inline" />
        RFP Contact
      </h3>

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-400">
          No verified RFP contact. Invitations will not be emailed to this firm.
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-md border border-gray-100 p-2.5"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{c.name}</p>
                {c.email ? (
                  <p className="text-xs text-gray-500">{c.email}</p>
                ) : (
                  <p className="text-xs text-amber-600">No email on record</p>
                )}
                <p className="text-xs text-gray-400">{c.role}</p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => openForm(c)}
                  className="text-xs text-gray-500 hover:text-scg-700"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && !isOpen && (
        <button
          type="button"
          onClick={() => openForm()}
          className="mt-3 w-full rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-scg-400 hover:text-scg-600"
        >
          + Add RFP Contact
        </button>
      )}

      {canEdit && isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-lg border border-gray-200 p-4"
        >
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            {editingId ? "Edit RFP contact" : "Add RFP contact"}
          </h4>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className={inputClass}
              placeholder="e.g. BD partner or panel coordinator"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
              className={inputClass}
              placeholder="name@firm.com"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Role (optional)
            </label>
            <input
              type="text"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
              maxLength={200}
              className={inputClass}
              placeholder="RFP Contact"
            />
          </div>

          {error && <div className="mb-3 text-xs text-red-600">{error}</div>}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-scg-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-scg-700 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save Contact"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
