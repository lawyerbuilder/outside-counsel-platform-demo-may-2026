"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

function buildEmailBody(firmName: string, rfpTitle: string, url: string): string {
  return `Dear ${firmName},

Siam Cement Group ("SCG") Legal Affairs invites your firm to submit a proposal in response to the following Request for Proposal:

  ${rfpTitle}

Please use the secure link below to access the submission portal and submit your proposal:

  ${url}

IMPORTANT - CONFIDENTIALITY NOTICE
This link is unique to ${firmName} and must not be shared with or forwarded to any third party. It is intended solely for the use of the designated recipient firm. If you believe you have received this in error, please notify the sender immediately and delete this email.

DISCLAIMER - LIABILITY FOR UPLOADED CONTENT
By submitting a proposal through this portal, ${firmName} represents and warrants that all files and content submitted are free from viruses, malware, malicious scripts, or any other harmful code. ${firmName} shall be solely responsible and liable for any damage, loss, or disruption caused to SCG's systems, data, or operations arising from any virus, malicious code, or harmful content contained in the materials submitted through this link.

We look forward to receiving your proposal.

Kind regards,
SCG Legal Affairs
Siam Cement Group`;
}

export function CopyLinkButton({
  rfpId,
  invitationId,
  rfpTitle,
  firmName,
}: {
  rfpId: string;
  invitationId: string;
  rfpTitle: string;
  firmName: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch(
        `/api/rfp/${rfpId}/invitations/${invitationId}/token`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed");
      const { url } = await res.json();

      const subject = `SCG Legal - Proposal Invitation: ${rfpTitle}`;
      const body = buildEmailBody(firmName, rfpTitle, url);

      // Open default email client with pre-filled draft
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, "_blank");

      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:text-gray-400"
      title="Open draft email with unique proposal link for this firm"
    >
      {state === "loading" ? (
        <Loader2 size={10} className="animate-spin" />
      ) : state === "done" ? (
        <Check size={10} className="text-scg-600" />
      ) : (
        <Mail size={10} />
      )}
      {state === "done" ? "Email opened" : "Email link"}
    </button>
  );
}
