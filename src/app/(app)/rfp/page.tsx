import Link from "next/link";
import { listRfps, countRfpsByStatus } from "@/server/rfp/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { RfpStatusBadge } from "@/components/rfp/RfpStatusBadge";
import { Plus } from "lucide-react";
import { DeleteDraftButton } from "@/components/rfp/DeleteDraftButton";

export const dynamic = "force-dynamic";

export default async function RfpListPage() {
  const [rfps, counts] = await Promise.all([listRfps(), countRfpsByStatus()]);

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matter Pricing & RFP"
        description={`${total} request(s) total`}
        action={
          <Link
            href="/rfp/new?step=1"
            className="inline-flex items-center gap-2 rounded-md bg-scg-700 px-4 py-2 text-sm font-medium text-white hover:bg-scg-800"
          >
            <Plus size={16} />
            New Request
          </Link>
        }
      />

      <div className="flex gap-2">
        {(["DRAFT", "PENDING_APPROVAL", "OPEN", "EVALUATING", "SHORTLISTED", "CLOSED", "CANCELLED"] as const).map(
          (status) => (
            <span
              key={status}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500"
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}: {counts[status] ?? 0}
            </span>
          )
        )}
      </div>

      {rfps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No RFPs yet. Click &ldquo;New Request&rdquo; to create one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Title</th>
                <th className="px-4 py-3 font-medium text-gray-500">Practice Area</th>
                <th className="px-4 py-3 font-medium text-gray-500">Jurisdiction</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Firms</th>
                <th className="px-4 py-3 font-medium text-gray-500">Created</th>
                <th className="px-4 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfps.map((rfp) => (
                <tr key={rfp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rfp/${rfp.id}`}
                      className="font-medium text-scg-700 hover:text-scg-800"
                    >
                      {rfp.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rfp.practiceArea?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rfp.jurisdiction?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RfpStatusBadge status={rfp.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {rfp.invitations.length}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(rfp.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {(rfp.status === "DRAFT" || rfp.status === "CANCELLED") && (
                      <DeleteDraftButton rfpId={rfp.id} rfpTitle={rfp.title} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
