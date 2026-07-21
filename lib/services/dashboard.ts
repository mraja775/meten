import { LeadStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardSummary(academyId: string) {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();

  const [
    newLeads,
    pendingFollowUps,
    trialsScheduled,
    pendingPayments,
    overduePayments,
    recentAdmissions,
    dueToday,
    collectedThisMonth,
    recentLeads,
    recentPayments
  ] = await prisma.$transaction([
    prisma.lead.count({
      where: { academyId, deletedAt: null, status: LeadStatus.NEW }
    }),
    prisma.lead.count({
      where: {
        academyId,
        deletedAt: null,
        followUpDate: { lte: todayEnd },
        status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.TRIAL_SCHEDULED] }
      }
    }),
    prisma.lead.count({
      where: {
        academyId,
        deletedAt: null,
        status: LeadStatus.TRIAL_SCHEDULED,
        followUpDate: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.payment.count({
      where: { academyId, deletedAt: null, status: PaymentStatus.PENDING }
    }),
    prisma.payment.count({
      where: {
        academyId,
        deletedAt: null,
        OR: [
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.PENDING, dueDate: { lt: todayStart } }
        ]
      }
    }),
    prisma.student.findMany({
      where: { academyId, deletedAt: null },
      orderBy: { joiningDate: "desc" },
      take: 5,
      select: { id: true, fullName: true, joiningDate: true }
    }),
    prisma.payment.findMany({
      where: {
        academyId,
        deletedAt: null,
        status: PaymentStatus.PENDING,
        dueDate: { gte: todayStart, lte: todayEnd }
      },
      take: 5,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        amount: true,
        dueDate: true,
        student: { select: { fullName: true } }
      }
    }),
    prisma.payment.aggregate({
      where: {
        academyId,
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidDate: { gte: monthStart }
      },
      _sum: { amount: true }
    }),
    prisma.lead.findMany({
      where: { academyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true }
    }),
    prisma.payment.findMany({
      where: { academyId, deletedAt: null, status: PaymentStatus.PAID },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        updatedAt: true,
        student: { select: { fullName: true } }
      }
    })
  ]);

  const todayTasks = [
    ...dueToday.map((payment) => ({
      id: payment.id,
      type: "PAYMENT_DUE",
      title: `${payment.student.fullName} payment due`,
      dueAt: payment.dueDate,
      amount: payment.amount
    })),
    ...recentLeads
      .filter((lead) => lead.status !== LeadStatus.JOINED && lead.status !== LeadStatus.LOST)
      .map((lead) => ({
        id: lead.id,
        type: "LEAD_FOLLOW_UP",
        title: `Follow up with ${lead.name}`,
        dueAt: lead.createdAt
      }))
  ].slice(0, 8);

  const recentActivity = [
    ...recentLeads.map((lead) => ({
      id: `lead-${lead.id}`,
      title: `Lead ${lead.name} is ${lead.status.toLowerCase().replaceAll("_", " ")}`,
      occurredAt: lead.createdAt
    })),
    ...recentPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      title: `Payment recorded for ${payment.student.fullName}`,
      occurredAt: payment.updatedAt
    }))
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 8);

  return {
    metrics: {
      newLeads,
      pendingFollowUps,
      trialsScheduled,
      pendingPayments,
      overduePayments,
      recentAdmissions: recentAdmissions.length,
      collectedThisMonth: collectedThisMonth._sum.amount ?? 0
    },
    recentAdmissions,
    todayTasks,
    recentActivity
  };
}
