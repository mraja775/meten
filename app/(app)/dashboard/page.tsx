import Link from "next/link";
import { Plus, Send, UserRoundPlus, WalletCards } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth/context";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { formatCurrencyINR, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSessionContext();
  const summary = await getDashboardSummary(session.academyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">What should I do today?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Focus on new enquiries, follow-ups, trials, and unpaid fees.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="New Leads" value={String(summary.metrics.newLeads)} helper="Needs first contact" />
        <MetricCard label="Pending Follow Ups" value={String(summary.metrics.pendingFollowUps)} helper="Due today" />
        <MetricCard label="Trials Scheduled" value={String(summary.metrics.trialsScheduled)} helper="Upcoming today" />
        <MetricCard label="Pending Payments" value={String(summary.metrics.pendingPayments)} helper="Open dues" />
        <MetricCard label="Overdue Payments" value={String(summary.metrics.overduePayments)} helper="Needs reminder" />
        <MetricCard label="Recent Admissions" value={String(summary.metrics.recentAdmissions)} helper="Latest joins" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/leads" className={buttonClassName()}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Link>
          <Link href="/payments" className={buttonClassName({ variant: "secondary" })}>
            <WalletCards className="h-4 w-4" />
            Record Payment
          </Link>
          <Link href="/messages" className={buttonClassName({ variant: "secondary" })}>
            <Send className="h-4 w-4" />
            Send Message
          </Link>
          <Link href="/students" className={buttonClassName({ variant: "secondary" })}>
            <UserRoundPlus className="h-4 w-4" />
            Create Student
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.todayTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="py-3 font-medium">{task.title}</td>
                      <td className="py-3 text-muted-foreground">
                        {task.type === "PAYMENT_DUE" ? "Payment" : "Follow-up"}
                      </td>
                      <td className="py-3">
                        {formatDate(task.dueAt)}
                      </td>
                    </tr>
                  ))}
                  {summary.todayTasks.length === 0 ? (
                    <tr>
                      <td className="py-6 text-muted-foreground" colSpan={3}>
                        No urgent tasks for today.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {summary.recentActivity.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                  <div>{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.occurredAt)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collected This Month</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatCurrencyINR(summary.metrics.collectedThisMonth)}
        </CardContent>
      </Card>
    </div>
  );
}
