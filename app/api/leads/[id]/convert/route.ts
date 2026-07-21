import { NextRequest } from "next/server";
import { LeadStatus, StudentStatus } from "@prisma/client";
import { apiData, apiError } from "@/lib/api/errors";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSessionContext();
  const lead = await prisma.lead.findFirst({
    where: { id, academyId: session.academyId, deletedAt: null }
  });

  if (!lead) {
    return apiError("NOT_FOUND", "Lead not found", 404);
  }

  if (lead.convertedStudentId) {
    return apiError("BAD_REQUEST", "Lead is already converted", 400);
  }

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        academyId: session.academyId,
        fullName: lead.name,
        guardianName: lead.parentName,
        phone: lead.phone,
        email: lead.email,
        joiningDate: new Date(),
        status: StudentStatus.ACTIVE,
        notes: lead.notes,
        sourceLeadId: lead.id,
        createdBy: session.userId,
        updatedBy: session.userId
      }
    });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: LeadStatus.JOINED,
        convertedStudentId: created.id,
        updatedBy: session.userId
      }
    });

    await tx.studentActivity.create({
      data: {
        academyId: session.academyId,
        studentId: created.id,
        type: "LEAD_CONVERTED",
        description: "Student created from lead.",
        createdBy: session.userId,
        updatedBy: session.userId
      }
    });

    return created;
  });

  return apiData(student, { status: 201 });
}
