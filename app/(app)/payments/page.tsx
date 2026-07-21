import { PaymentStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  createPaymentAction,
  markPaymentPaidAction
} from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrencyINR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

function paymentTone(status: PaymentStatus, dueDate: Date) {
  if (status === PaymentStatus.PAID) {
    return "green" as const;
  }

  return dueDate < startOfToday() ? "red" as const : "amber" as const;
}

export default async function PaymentsPage() {
  const session = await getSessionContext();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();

  const [payments, students, dueToday, overdue, collected] = await prisma.$transaction([
    prisma.payment.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      take: 100,
      include: {
        student: { select: { fullName: true, phone: true } }
      }
    }),
    prisma.student.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        status: "ACTIVE"
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true }
    }),
    prisma.payment.count({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        status: PaymentStatus.PENDING,
        dueDate: { gte: todayStart, lte: todayEnd }
      }
    }),
    prisma.payment.count({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        OR: [
          { status: PaymentStatus.OVERDUE },
          { status: PaymentStatus.PENDING, dueDate: { lt: todayStart } }
        ]
      }
    }),
    prisma.payment.aggregate({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        status: PaymentStatus.PAID,
        paidDate: { gte: monthStart }
      },
      _sum: { amount: true }
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track who owes money without becoming accounting software.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Due Today</div><div className="mt-2 text-2xl font-semibold">{dueToday}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Overdue</div><div className="mt-2 text-2xl font-semibold">{overdue}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Collected This Month</div><div className="mt-2 text-2xl font-semibold">{formatCurrencyINR(collected._sum.amount ?? 0)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">Open Payments</div><div className="mt-2 text-2xl font-semibold">{payments.filter((payment) => payment.status !== PaymentStatus.PAID).length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Payment Due</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPaymentAction} className="grid gap-3 lg:grid-cols-6">
            <select
              name="studentId"
              className="h-9 rounded-md border bg-background px-3 text-sm lg:col-span-2"
              aria-label="Student"
              required
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName}
                </option>
              ))}
            </select>
            <Input name="amount" type="number" min={1} placeholder="Amount" aria-label="Amount" required />
            <Input name="dueDate" type="date" aria-label="Due date" required />
            <Input name="receiptNumber" placeholder="Receipt no." aria-label="Receipt number" />
            <Button type="submit" className="lg:self-start">
              <Plus className="h-4 w-4" />
              Add Due
            </Button>
            <textarea
              name="notes"
              className="min-h-20 rounded-md border bg-background p-3 text-sm lg:col-span-5"
              placeholder="Notes"
              aria-label="Notes"
            />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Due</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => {
                  const displayStatus =
                    payment.status === PaymentStatus.PENDING && payment.dueDate < todayStart
                      ? "overdue"
                      : payment.status.toLowerCase();

                  return (
                    <tr key={payment.id}>
                      <td className="py-3 font-medium">{payment.student.fullName}</td>
                      <td className="py-3">{formatCurrencyINR(payment.amount)}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(payment.dueDate)}</td>
                      <td className="py-3">
                        <Badge tone={paymentTone(payment.status, payment.dueDate)}>
                          {displayStatus}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {payment.status !== PaymentStatus.PAID ? (
                          <form action={markPaymentPaidAction}>
                            <input type="hidden" name="id" value={payment.id} />
                            <Button type="submit" variant="secondary" className="h-8 text-xs">
                              Mark Paid
                            </Button>
                          </form>
                        ) : (
                          <span className="text-muted-foreground">Paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
