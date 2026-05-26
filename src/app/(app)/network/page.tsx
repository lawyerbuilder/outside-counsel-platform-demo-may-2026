import Link from "next/link";
import { Suspense } from "react";
import { GitBranch, ArrowRight, Users, Trophy, Building2 } from "lucide-react";
import {
  getNetworkData,
  getSpinOffComparisons,
  getAlumni,
  getFirmsWithAlumni,
} from "@/server/network";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { NpsBadge } from "@/components/ui/NpsBadge";
import { NetworkGraph } from "@/components/network/NetworkGraph";
import { AlumniSearch } from "@/components/network/AlumniSearch";
import { FIRM_TYPE_LABELS, LAWYER_ROLE_LABELS } from "@/lib/schemas";
import type { FirmTypeEnum, LawyerRoleEnum } from "@/lib/schemas";

export const dynamic = "force-dynamic";

interface NetworkPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NetworkPage({ searchParams }: NetworkPageProps) {
  const params = await searchParams;
  const alumniFromId = params.alumniFrom as string | undefined;

  const [networkData, comparisons, firmsWithAlumni] = await Promise.all([
    getNetworkData(),
    getSpinOffComparisons(),
    getFirmsWithAlumni(),
  ]);

  const alumni = alumniFromId ? await getAlumni(alumniFromId) : [];
  const alumniFromFirm = alumniFromId
    ? firmsWithAlumni.find((f) => f.id === alumniFromId)
    : null;

  return (
    <div>
      <PageHeader
        title="Boutique Network"
        description="Visualize firm spin-offs, partner movements, and alumni career paths"
      />

      {/* Network Graph */}
      {networkData.nodes.length > 0 ? (
        <div className="mb-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <GitBranch size={14} />
            Firm Network
          </h3>
          <NetworkGraph nodes={networkData.nodes} edges={networkData.edges} />
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <GitBranch size={32} className="mx-auto text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No spin-off relationships found. Add parentFirmId to firms to see the network.
          </p>
        </div>
      )}

      {/* Spin-off Comparisons */}
      {comparisons.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <Building2 size={14} />
            Spin-off Performance Comparison
          </h3>
          <div className="space-y-4">
            {comparisons.map((comp) => (
              <div
                key={comp.spinOff.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {/* Parent */}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Link
                        href={`/firms/${comp.parent.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-scg-700"
                      >
                        {comp.parent.shortName ?? comp.parent.name}
                      </Link>
                      <Badge variant="default">Parent</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <Badge variant="scg">
                        {FIRM_TYPE_LABELS[comp.parent.firmType as FirmTypeEnum]}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {comp.parent.lawyerCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy size={12} /> {comp.parent.rankingCount}
                      </span>
                    </div>
                    <div className="mt-2">
                      <NpsBadge nps={comp.parent.nps} size="sm" />
                    </div>
                  </div>

                  {/* Spin-off */}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <Link
                        href={`/firms/${comp.spinOff.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-scg-700"
                      >
                        {comp.spinOff.shortName ?? comp.spinOff.name}
                      </Link>
                      <Badge variant="amber">Spin-off</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <Badge variant="amber">
                        {FIRM_TYPE_LABELS[comp.spinOff.firmType as FirmTypeEnum]}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {comp.spinOff.lawyerCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy size={12} /> {comp.spinOff.rankingCount}
                      </span>
                    </div>
                    <div className="mt-2">
                      <NpsBadge nps={comp.spinOff.nps} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Moved lawyers */}
                {comp.movedLawyers.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      <ArrowRight size={12} className="mr-1 inline" />
                      Lawyers who moved ({comp.movedLawyers.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {comp.movedLawyers.map((l) => (
                        <Link
                          key={l.id}
                          href={`/lawyers/${l.id}`}
                          className="rounded-md bg-white px-2 py-1 text-xs text-gray-700 shadow-sm hover:text-scg-700"
                        >
                          {l.name}
                          <span className="ml-1 text-gray-400">
                            ({LAWYER_ROLE_LABELS[l.role as LawyerRoleEnum]})
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alumni Search */}
      <div className="mb-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <Users size={14} />
          Alumni Search
        </h3>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Suspense fallback={null}>
            <AlumniSearch firms={firmsWithAlumni} />
          </Suspense>

          {alumniFromFirm && (
            <div className="mt-4">
              <p className="mb-3 text-sm text-gray-600">
                {alumni.length} former lawyer{alumni.length !== 1 ? "s" : ""} from{" "}
                <span className="font-medium">
                  {alumniFromFirm.shortName ?? alumniFromFirm.name}
                </span>
              </p>

              {alumni.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No alumni records found for this firm.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {alumni.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <Link
                          href={`/lawyers/${a.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-scg-700"
                        >
                          {a.name}
                        </Link>
                        {a.title && (
                          <p className="text-xs text-gray-500">{a.title}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {LAWYER_ROLE_LABELS[a.role as LawyerRoleEnum]}
                          {a.startDate &&
                            ` · ${new Date(a.startDate).getFullYear()}`}
                          {a.endDate &&
                            ` – ${new Date(a.endDate).getFullYear()}`}
                        </p>
                      </div>
                      <div>
                        {a.currentFirm ? (
                          <Link
                            href={`/firms/${a.currentFirm.id}`}
                            className="flex items-center gap-2 text-xs text-gray-600 hover:text-scg-700"
                          >
                            <ArrowRight size={12} className="text-amber-500" />
                            <span>
                              Now at{" "}
                              <span className="font-medium">
                                {a.currentFirm.shortName ?? a.currentFirm.name}
                              </span>
                            </span>
                            <Badge
                              variant={
                                a.currentFirm.firmType === "BOUTIQUE"
                                  ? "amber"
                                  : "default"
                              }
                            >
                              {FIRM_TYPE_LABELS[a.currentFirm.firmType as FirmTypeEnum]}
                            </Badge>
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Current firm unknown
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
