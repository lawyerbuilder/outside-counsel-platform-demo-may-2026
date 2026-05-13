import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  Users,
  Pencil,
  ExternalLink,
  GitBranch,
  Briefcase,
} from "lucide-react";
import { getFirmById } from "@/server/firms";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FIRM_TYPE_LABELS, LAWYER_ROLE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum } from "@/lib/schemas";

const firmTypeBadgeVariant: Record<FirmTypeEnum, "teal" | "amber" | "blue" | "gray"> = {
  FULL_SERVICE: "teal",
  BOUTIQUE: "amber",
  MID_SIZE: "blue",
  REGIONAL: "gray",
};

interface FirmDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FirmDetailPage({ params }: FirmDetailPageProps) {
  const { id } = await params;
  const firm = await getFirmById(id);

  if (!firm || firm.deletedAt) {
    notFound();
  }

  const currentLawyers = firm.firmLawyers.filter((fl) => fl.isCurrent);
  const formerLawyers = firm.firmLawyers.filter((fl) => !fl.isCurrent);
  const practiceAreas = firm.practiceAreas;

  return (
    <div>
      <PageHeader
        title={firm.name}
        breadcrumbs={[
          { label: "Firms", href: "/firms" },
          { label: firm.shortName ?? firm.name },
        ]}
        action={
          <Link
            href={`/firms/${firm.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} />
            Edit
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Overview Card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Overview
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Badge variant={firmTypeBadgeVariant[firm.firmType]}>
                  {FIRM_TYPE_LABELS[firm.firmType]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400" />
                {firm.city}, {firm.country}
              </div>
              {firm.foundedYear && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  Founded {firm.foundedYear}
                </div>
              )}
              {firm.headcount && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={16} className="text-gray-400" />
                  {firm.headcount.toLocaleString()} people (global)
                </div>
              )}
              {firm.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe size={16} className="text-gray-400" />
                  <a
                    href={firm.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 hover:underline"
                  >
                    Website
                    <ExternalLink size={12} className="ml-1 inline" />
                  </a>
                </div>
              )}
            </div>

            {firm.notes && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">{firm.notes}</p>
              </div>
            )}
          </div>

          {/* Lawyers */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                <Users size={14} className="mr-2 inline" />
                Current Lawyers ({currentLawyers.length})
              </h3>
            </div>
            {currentLawyers.length === 0 ? (
              <p className="text-sm text-gray-400">No lawyers on record.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {currentLawyers.map((fl) => (
                  <Link
                    key={fl.id}
                    href={`/lawyers/${fl.lawyer.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fl.lawyer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fl.lawyer.title}
                      </p>
                    </div>
                    <Badge variant="default">
                      {LAWYER_ROLE_LABELS[fl.role]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {formerLawyers.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Former ({formerLawyers.length})
                </h4>
                <div className="divide-y divide-gray-50">
                  {formerLawyers.map((fl) => (
                    <Link
                      key={fl.id}
                      href={`/lawyers/${fl.lawyer.id}`}
                      className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <p className="text-sm text-gray-600">
                          {fl.lawyer.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {fl.startDate &&
                            new Date(fl.startDate).getFullYear()}
                          {" - "}
                          {fl.endDate
                            ? new Date(fl.endDate).getFullYear()
                            : "present"}
                        </p>
                      </div>
                      <Badge variant="gray">
                        {LAWYER_ROLE_LABELS[fl.role]}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Practice Areas */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Briefcase size={14} className="mr-2 inline" />
              Practice Areas
            </h3>
            {practiceAreas.length === 0 ? (
              <p className="text-sm text-gray-400">None recorded.</p>
            ) : (
              <div className="space-y-2">
                {practiceAreas.map((fpa) => (
                  <div key={fpa.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {fpa.practiceArea.name}
                    </span>
                    {fpa.jurisdiction && (
                      <Badge variant="gray">{fpa.jurisdiction.name}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Spin-off Lineage */}
          {(firm.parentFirm || firm.spinOffs.length > 0) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                <GitBranch size={14} className="mr-2 inline" />
                Firm Lineage
              </h3>
              {firm.parentFirm && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Spin-off from</p>
                  <Link
                    href={`/firms/${firm.parentFirm.id}`}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    {firm.parentFirm.name}
                  </Link>
                </div>
              )}
              {firm.spinOffs.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Spin-offs</p>
                  <div className="space-y-1">
                    {firm.spinOffs.map((so) => (
                      <Link
                        key={so.id}
                        href={`/firms/${so.id}`}
                        className="block text-sm text-teal-700 hover:underline"
                      >
                        {so.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Placeholder cards for future sessions */}
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-400">
              Rankings
            </h3>
            <p className="text-xs text-gray-400">Coming in Session 3</p>
          </div>

          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-400">
              Internal Ratings & NPS
            </h3>
            <p className="text-xs text-gray-400">Coming in Session 4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
