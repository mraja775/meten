"use server";

import {
  LeadStatus,
  MessageStatus,
  MessageTemplate,
  MessageType,
  PaymentStatus,
  StudentStatus
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSessionContext } from "@/lib/auth/context";
import {
  createLeadSchema,
  leadStatusSchema
} from "@/lib/validations/leads";
import { createStudentSchema } from "@/lib/validations/students";
import { createPaymentSchema } from "@/lib/validations/payments";
import { createMessageSchema } from "@/lib/validations/messages";
import { updateSettingsSchema } from "@/lib/validations/settings";

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredString(value: FormDataEntryValue | null) {
  return optionalString(value) ?? "";
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text ? new Date(text) : undefined;
}

function revalidateCrm() {
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  revalidatePath("/students");
  revalidatePath("/payments");
  revalidatePath("/messages");
  revalidatePath("/settings");
}

export async function createLeadAction(formData: FormData) {
  const session = await getSessionContext();
  const parsed = createLeadSchema.parse({
    name: requiredString(formData.get("name")),
    phone: requiredString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    parentName: optionalString(formData.get("parentName")),
    studentAge: optionalString(formData.get("studentAge")),
    source: optionalString(formData.get("source")),
    status: formData.get("status") ?? LeadStatus.NEW,
    notes: optionalString(formData.get("notes")),
    followUpDate: optionalDate(formData.get("followUpDate"))
  });

  await prisma.lead.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      activities: {
        create: {
          academyId: session.academyId,
          type: "LEAD_CREATED",
          description: "Lead created.",
          createdBy: session.userId,
          updatedBy: session.userId
        }
      }
    }
  });

  revalidateCrm();
}

export async function updateLeadStatusAction(formData: FormData) {
  const session = await getSessionContext();
  const id = requiredString(formData.get("id"));
  const status = leadStatusSchema.parse(formData.get("status"));

  await prisma.lead.updateMany({
    where: {
      id,
      academyId: session.academyId,
      deletedAt: null
    },
    data: {
      status,
      updatedBy: session.userId
    }
  });

  await prisma.leadActivity.create({
    data: {
      academyId: session.academyId,
      leadId: id,
      type: "STATUS_UPDATED",
      description: `Status changed to ${status.toLowerCase().replaceAll("_", " ")}.`,
      createdBy: session.userId,
      updatedBy: session.userId
    }
  });

  revalidateCrm();
}

export async function convertLeadAction(formData: FormData) {
  const session = await getSessionContext();
  const id = requiredString(formData.get("id"));

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      academyId: session.academyId,
      deletedAt: null
    }
  });

  if (!lead || lead.convertedStudentId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
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
        convertedStudentId: student.id,
        updatedBy: session.userId
      }
    });

    await tx.studentActivity.create({
      data: {
        academyId: session.academyId,
        studentId: student.id,
        type: "LEAD_CONVERTED",
        description: "Student created from lead.",
        createdBy: session.userId,
        updatedBy: session.userId
      }
    });
  });

  revalidateCrm();
}

export async function createStudentAction(formData: FormData) {
  const session = await getSessionContext();
  const parsed = createStudentSchema.parse({
    fullName: requiredString(formData.get("fullName")),
    guardianName: optionalString(formData.get("guardianName")),
    phone: requiredString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    joiningDate: requiredString(formData.get("joiningDate")),
    status: formData.get("status") ?? StudentStatus.ACTIVE,
    notes: optionalString(formData.get("notes"))
  });

  await prisma.student.create({
    data: {
      ...parsed,
      email: parsed.email || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      activities: {
        create: {
          academyId: session.academyId,
          type: "STUDENT_CREATED",
          description: "Student created.",
          createdBy: session.userId,
          updatedBy: session.userId
        }
      }
    }
  });

  revalidateCrm();
}

export async function createPaymentAction(formData: FormData) {
  const session = await getSessionContext();
  const parsed = createPaymentSchema.parse({
    studentId: requiredString(formData.get("studentId")),
    amount: requiredString(formData.get("amount")),
    dueDate: requiredString(formData.get("dueDate")),
    status: PaymentStatus.PENDING,
    receiptNumber: optionalString(formData.get("receiptNumber")),
    notes: optionalString(formData.get("notes"))
  });

  const student = await prisma.student.findFirst({
    where: {
      id: parsed.studentId,
      academyId: session.academyId,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!student) {
    return;
  }

  await prisma.payment.create({
    data: {
      ...parsed,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId
    }
  });

  revalidateCrm();
}

export async function markPaymentPaidAction(formData: FormData) {
  const session = await getSessionContext();
  const id = requiredString(formData.get("id"));

  await prisma.payment.updateMany({
    where: {
      id,
      academyId: session.academyId,
      deletedAt: null
    },
    data: {
      status: PaymentStatus.PAID,
      paidDate: new Date(),
      updatedBy: session.userId
    }
  });

  revalidateCrm();
}

export async function createMessageAction(formData: FormData) {
  const session = await getSessionContext();
  const studentId = requiredString(formData.get("studentId"));
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      academyId: session.academyId,
      deletedAt: null
    }
  });

  if (!student) {
    return;
  }

  const parsed = createMessageSchema.parse({
    type: formData.get("type") ?? MessageType.WHATSAPP,
    template: formData.get("template") ?? MessageTemplate.CUSTOM,
    subject: optionalString(formData.get("subject")),
    body: requiredString(formData.get("body")),
    status: MessageStatus.RECORDED,
    recipients: [
      {
        studentId,
        phone: student.phone,
        email: student.email ?? undefined,
        recipientName: student.guardianName ?? student.fullName
      }
    ]
  });

  const { recipients, ...message } = parsed;

  await prisma.message.create({
    data: {
      ...message,
      subject: message.subject || null,
      academyId: session.academyId,
      createdBy: session.userId,
      updatedBy: session.userId,
      recipients: {
        create: recipients.map((recipient) => ({
          ...recipient,
          academyId: session.academyId,
          createdBy: session.userId,
          updatedBy: session.userId
        }))
      }
    }
  });

  revalidateCrm();
}

export async function updateSettingsAction(formData: FormData) {
  const session = await getSessionContext();
  const parsed = updateSettingsSchema.parse({
    name: requiredString(formData.get("name")),
    logoUrl: optionalString(formData.get("logoUrl")),
    address: optionalString(formData.get("address")),
    phone: optionalString(formData.get("phone")),
    email: optionalString(formData.get("email")),
    businessHours: optionalString(formData.get("businessHours")),
    brandPrimaryColor: requiredString(formData.get("brandPrimaryColor")),
    brandSecondaryColor: requiredString(formData.get("brandSecondaryColor"))
  });

  await prisma.academy.update({
    where: { id: session.academyId },
    data: {
      ...parsed,
      logoUrl: parsed.logoUrl || null,
      email: parsed.email || null,
      updatedBy: session.userId
    }
  });

  revalidateCrm();
}
