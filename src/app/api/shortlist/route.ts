import { z } from "zod";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/current-user";

export const dynamic = "force-dynamic";

const SHORTLIST_SENTINEL = "__ai_shortlist__";

const postSchema = z.object({
  action: z.enum(["add_firm", "remove_firm", "clear", "approve"]),
  firmId: z.string().min(1).optional(),
});

type ShortlistFirm = {
  id: string;
  name: string;
  shortName: string | null;
  country: string;
  city: string | null;
  invitationId: string;
};

function mapInvitations(
  invitations: Array<{
    id: string;
    firm: { id: string; name: string; shortName: string | null; country: string; city: string | null };
  }>
): ShortlistFirm[] {
  return invitations.map((i) => ({
    id: i.firm.id,
    name: i.firm.name,
    shortName: i.firm.shortName,
    country: i.firm.country,
    city: i.firm.city,
    invitationId: i.id,
  }));
}

async function getOrCreateShortlist(userId: string) {
  const existing = await prisma.rfp.findFirst({
    where: { title: SHORTLIST_SENTINEL, status: "DRAFT", createdById: userId },
    include: {
      invitations: {
        include: {
          firm: {
            select: { id: true, name: true, shortName: true, country: true, city: true },
          },
        },
      },
    },
  });

  if (existing) return existing;

  return prisma.rfp.create({
    data: { title: SHORTLIST_SENTINEL, status: "DRAFT", createdById: userId },
    include: {
      invitations: {
        include: {
          firm: {
            select: { id: true, name: true, shortName: true, country: true, city: true },
          },
        },
      },
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const rfp = await getOrCreateShortlist(user.id);
    return Response.json({
      rfpId: rfp.id,
      firms: mapInvitations(rfp.invitations),
    });
  } catch (err) {
    console.error("Shortlist GET error:", err);
    return Response.json({ rfpId: null, firms: [] });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const { action, firmId } = parsed.data;

    const rfp = await getOrCreateShortlist(user.id);

    switch (action) {
      case "add_firm": {
        if (!firmId) {
          return Response.json({ error: "firmId required" }, { status: 400 });
        }
        const already = rfp.invitations.some((i) => i.firm.id === firmId);
        if (!already) {
          await prisma.rfpInvitation.create({
            data: { rfpId: rfp.id, firmId },
          });
        }
        const updated = await getOrCreateShortlist(user.id);
        return Response.json({
          ok: true,
          rfpId: updated.id,
          firms: mapInvitations(updated.invitations),
        });
      }

      case "remove_firm": {
        if (!firmId) {
          return Response.json({ error: "firmId required" }, { status: 400 });
        }
        await prisma.rfpInvitation.deleteMany({
          where: { rfpId: rfp.id, firmId },
        });
        const updated = await getOrCreateShortlist(user.id);
        return Response.json({
          ok: true,
          rfpId: updated.id,
          firms: mapInvitations(updated.invitations),
        });
      }

      case "clear": {
        await prisma.rfpInvitation.deleteMany({ where: { rfpId: rfp.id } });
        return Response.json({ ok: true, rfpId: rfp.id, firms: [] });
      }

      case "approve": {
        await prisma.rfp.update({
          where: { id: rfp.id },
          data: { status: "OPEN" },
        });
        return Response.json({
          ok: true,
          rfpId: rfp.id,
          firms: mapInvitations(rfp.invitations),
        });
      }

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("Shortlist POST error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
