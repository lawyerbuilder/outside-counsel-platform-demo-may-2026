import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getDemoRole } from "@/server/demo-role";

const contactSchema = z.object({
  // When present, update the existing contact instead of creating a new one
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  role: z.string().max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const role = await getDemoRole();
  if (role === "LAWYER") {
    return NextResponse.json(
      { error: "Only a manager can manage RFP contacts" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const firm = await prisma.firm.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });
  if (!firm || firm.deletedAt) {
    return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  }

  const data = parsed.data;
  const contactRole = data.role?.trim() || "RFP Contact";

  if (data.id) {
    const existing = await prisma.firmContact.findUnique({
      where: { id: data.id },
      select: { firmId: true },
    });
    if (!existing || existing.firmId !== id) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const contact = await prisma.firmContact.update({
      where: { id: data.id },
      data: { name: data.name, email: data.email, role: contactRole },
    });
    return NextResponse.json(contact);
  }

  const contact = await prisma.firmContact.create({
    data: {
      firmId: id,
      name: data.name,
      email: data.email,
      role: contactRole,
      isPrimary: true,
    },
  });
  return NextResponse.json(contact, { status: 201 });
}
