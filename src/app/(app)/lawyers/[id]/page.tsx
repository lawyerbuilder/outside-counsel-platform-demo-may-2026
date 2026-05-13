import { notFound } from "next/navigation";
import Link from "next/link";
import {
  User,
  Building2,
  Calendar,
  Mail,
  Pencil,
  ExternalLink,
  Scale,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { getLawyerById } from "@/server/lawyers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { LAWYER_ROLE_LABELS } from "@/lib/schemas";

interface LawyerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LawyerDetailPage({
  params,
}: LawyerDetailPageProps) {
  const { id } = await params;
  const lawyer = await getLawyerById(id);

  if (!lawyer || lawyer.deletedAt) {
    notFound();
  }

  const currentPositions = lawyer.firmLawyers.filter((fl) => fl.isCurrent);
  const careerHistory = lawyer.firmLawyers.filter((fl) => !fl.isCurrent);

  return (
    <div>
      <PageHeader
        title={lawyer.name}
        breadcrumbs={[
          { label: "Lawyers", href: "/lawyers" },
          { label: lawyer.name },
        ]}
        action={
          <Link
            href={`/lawyers/${lawyer.id}/edit`}
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
          {/* Overview */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Overview
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {lawyer.title && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={16} className="text-gray-400" />
                  {lawyer.title}
                </div>
              )}
              {currentPositions.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 size={16} className="text-gray-400" />
                  <Link
                    href={`/firms/${currentPositions[0].firm.id}`}
                    className="text-teal-700 hover:underline"
                  >
                    {currentPositions[0].firm.name}
                  </Link>
                  <Badge variant="default">
                    {LAWYER_ROLE_LABELS[currentPositions[0].role]}
                  </Badge>
                </div>
              )}
              {lawyer.qualificationYear && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  Qualified {lawyer.qualificationYear}
                </div>
              )}
              {lawyer.barAdmissions && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Scale size={16} className="text-gray-400" />
                  {lawyer.barAdmissions}
                </div>
              )}
              {lawyer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} className="text-gray-400" />
                  {lawyer.email}
                </div>
              )}
              {lawyer.linkedInUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink size={16} className="text-gray-400" />
                  <a
                    href={lawyer.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 hover:underline"
                  >
                    LinkedIn
                    <ExternalLink size={12} className="ml-1 inline" />
                  </a>
                </div>
              )}
            </div>

            {lawyer.bio && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm leading-relaxed text-gray-600">
                  {lawyer.bio}
                </p>
              </div>
            )}
          </div>

          {/* Career History */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <Briefcase size={14} className="mr-2 inline" />
              Career History
            </h3>

            <div className="space-y-4">
              {/* Current positions */}
              {currentPositions.map((fl) => (
                <div
                  key={fl.id}
                  className="flex items-start gap-3 rounded-md border border-teal-100 bg-teal-50/50 p-3"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-teal-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/firms/${fl.firm.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-teal-700"
                      >
                        {fl.firm.name}
                      </Link>
                      <Badge variant="teal">Current</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {LAWYER_ROLE_LABELS[fl.role]}
                      {fl.startDate &&
                        ` | Since ${new Date(fl.startDate).getFullYear()}`}
                    </p>
                  </div>
                </div>
              ))}

              {/* Past positions */}
              {careerHistory.map((fl) => (
                <div
                  key={fl.id}
                  className="flex items-start gap-3 rounded-md p-3"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-gray-300" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/firms/${fl.firm.id}`}
                        className="text-sm font-medium text-gray-700 hover:text-teal-700"
                      >
                        {fl.firm.name}
                      </Link>
                      <span className="text-xs text-gray-400">
                        {fl.startDate &&
                          new Date(fl.startDate).getFullYear()}
                        {" - "}
                        {fl.endDate
                          ? new Date(fl.endDate).getFullYear()
                          : "?"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {LAWYER_ROLE_LABELS[fl.role]}
                    </p>
                  </div>
                </div>
              ))}

              {currentPositions.length === 0 && careerHistory.length === 0 && (
                <p className="text-sm text-gray-400">
                  No career history recorded.
                </p>
              )}
            </div>

            {/* If lawyer moved from one firm to another, show the movement */}
            {careerHistory.length > 0 && currentPositions.length > 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
                <ArrowRight size={14} />
                Moved from {careerHistory[0]?.firm.name} to{" "}
                {currentPositions[0]?.firm.name}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Practice Areas */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Practice Areas
            </h3>
            {lawyer.practiceAreas.length === 0 ? (
              <p className="text-sm text-gray-400">None recorded.</p>
            ) : (
              <div className="space-y-2">
                {lawyer.practiceAreas.map((lpa) => (
                  <div
                    key={lpa.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700">
                      {lpa.practiceArea.name}
                    </span>
                    {lpa.jurisdiction && (
                      <Badge variant="gray">{lpa.jurisdiction.name}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Placeholder cards */}
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
