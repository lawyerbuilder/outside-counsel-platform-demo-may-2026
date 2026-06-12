import { z } from "zod";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  updates: z
    .array(
      z.object({
        firmId: z.string().min(1),
        notes: z.string().max(5000),
      })
    )
    .min(1, "No updates provided")
    .max(200),
});

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    const { updates } = parsed.data;

    // Update each firm's internalNotes
    const results = await Promise.all(
      updates.map((u) =>
        prisma.firm.update({
          where: { id: u.firmId },
          data: { internalNotes: u.notes || null },
          select: { id: true, name: true, shortName: true },
        })
      )
    );

    return Response.json({
      success: true,
      count: results.length,
      firms: results.map((r) => r.shortName ?? r.name),
    });
  } catch (err) {
    console.error("Apply notes error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
