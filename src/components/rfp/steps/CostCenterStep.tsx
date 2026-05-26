"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Building2, CheckCircle2, Plus, Trash2, UserPlus, XCircle } from "lucide-react";

type CostCenterMatch = {
  id: string;
  code: string;
  name: string;
  entityName: string;
  entityCountry: string;
};

type ContactPerson = {
  name: string;
  email: string;
  role: string;
};

export function CostCenterStep({
  draftId,
  defaults,
}: {
  draftId?: string;
  defaults?: {
    costCenterCode?: string;
    costCenterMatch?: CostCenterMatch | null;
    contactPersons?: ContactPerson[];
  };
}) {
  const router = useRouter();
  const [code, setCode] = useState(defaults?.costCenterCode ?? "");
  const [match, setMatch] = useState<CostCenterMatch | null>(defaults?.costCenterMatch ?? null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "searching" | "found" | "not_found">(
    defaults?.costCenterMatch ? "found" : "idle"
  );
  const [contacts, setContacts] = useState<ContactPerson[]>(
    defaults?.contactPersons ?? [{ name: "", email: "", role: "" }]
  );

  async function lookupCostCenter(searchCode: string) {
    if (searchCode.length < 3) return;
    setLookupStatus("searching");
    setMatch(null);
    try {
      const res = await fetch(`/api/rfp/cost-center?code=${encodeURIComponent(searchCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.costCenter) {
          setMatch(data.costCenter);
          setLookupStatus("found");
        } else {
          setLookupStatus("not_found");
        }
      } else {
        setLookupStatus("not_found");
      }
    } catch {
      setLookupStatus("not_found");
    }
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: "", email: "", role: "" }]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof ContactPerson, value: string) {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  const hasValidContacts = contacts.some((c) => c.name.trim() && c.email.trim());
  const canProceed = lookupStatus === "found" && match && hasValidContacts;

  const searchParams = useSearchParams();

  function handleNext() {
    if (!canProceed || !match) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "2");
    if (draftId) params.set("draftId", draftId);
    params.set("costCenterId", match.id);
    params.set("costCenterCode", match.code);
    params.set("costCenterName", match.name);
    params.set("contactPersons", JSON.stringify(contacts.filter((c) => c.name.trim() && c.email.trim())));
    router.push(`/rfp/new?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-base font-medium">Cost center & requesting BU</Label>
        <p className="mt-1 text-sm text-gray-500">
          Enter the cost center code for the business unit requesting outside counsel.
          The system will identify the entity automatically.
        </p>
      </div>

      {/* Cost center lookup */}
      <div className="space-y-2">
        <Label htmlFor="costCenter">Cost center code *</Label>
        <div className="flex gap-2">
          <Input
            id="costCenter"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (e.target.value.length < 3) {
                setLookupStatus("idle");
                setMatch(null);
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && lookupCostCenter(code)}
            placeholder="e.g., 7040"
            className="w-40"
          />
          <button
            onClick={() => lookupCostCenter(code)}
            disabled={code.length < 3 || lookupStatus === "searching"}
            className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {lookupStatus === "searching" ? "Looking up..." : "Look up"}
          </button>
        </div>

        {lookupStatus === "found" && match && (
          <div className="flex items-start gap-3 rounded-lg border border-scg-300 bg-scg-50 p-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-scg-600" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{match.code}</span>
                <span className="text-sm text-gray-600">— {match.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Building2 size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  {match.entityName} · {match.entityCountry}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 border-scg-300 text-scg-700 text-[10px]">
              Matched
            </Badge>
          </div>
        )}

        {lookupStatus === "not_found" && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <XCircle size={16} className="shrink-0 text-red-500" />
            <span className="text-sm text-red-700">
              No cost center found for "{code}". Check the code and try again.
            </span>
          </div>
        )}
      </div>

      {/* Contact persons */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div>
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <UserPlus size={14} />
            Contact person(s) — requesting BU *
          </Label>
          <p className="mt-1 text-xs text-gray-400">
            Who is requesting this service? These contacts will be responsible for invoice approval and payment.
          </p>
        </div>

        {contacts.map((contact, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-3 gap-2">
              <Input
                value={contact.name}
                onChange={(e) => updateContact(i, "name", e.target.value)}
                placeholder="Full name *"
              />
              <Input
                value={contact.email}
                onChange={(e) => updateContact(i, "email", e.target.value)}
                placeholder="Email *"
                type="email"
              />
              <Input
                value={contact.role}
                onChange={(e) => updateContact(i, "role", e.target.value)}
                placeholder="Role (optional)"
              />
            </div>
            {contacts.length > 1 && (
              <button
                onClick={() => removeContact(i)}
                className="mt-2 rounded p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addContact}
          className="flex items-center gap-1 text-sm text-scg-700 hover:text-scg-800"
        >
          <Plus size={14} /> Add another contact
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  );
}
