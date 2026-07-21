import { StudentStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import { createStudentAction } from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const session = await getSessionContext();
  const students = await prisma.student.findMany({
    where: {
      academyId: session.academyId,
      deletedAt: null
    },
    orderBy: { joiningDate: "desc" },
    take: 100,
    include: {
      payments: {
        where: { deletedAt: null },
        orderBy: { dueDate: "desc" },
        take: 1
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Maintain student contact details and payment context.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Student</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStudentAction} className="grid gap-3 lg:grid-cols-6">
            <Input name="fullName" placeholder="Full name" aria-label="Full name" required />
            <Input name="guardianName" placeholder="Guardian" aria-label="Guardian" />
            <Input name="phone" placeholder="Phone" aria-label="Phone" required />
            <Input name="email" type="email" placeholder="Email" aria-label="Email" />
            <Input name="joiningDate" type="date" aria-label="Joining date" required />
            <select
              name="status"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={StudentStatus.ACTIVE}
              aria-label="Student status"
            >
              <option value={StudentStatus.ACTIVE}>Active</option>
              <option value={StudentStatus.INACTIVE}>Inactive</option>
            </select>
            <textarea
              name="notes"
              className="min-h-20 rounded-md border bg-background p-3 text-sm lg:col-span-5"
              placeholder="Notes"
              aria-label="Notes"
            />
            <Button type="submit" className="lg:self-start">
              <Plus className="h-4 w-4" />
              Create Student
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Guardian</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Joining</th>
                  <th className="pb-3 font-medium">Latest Payment</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => {
                  const latestPayment = student.payments[0];

                  return (
                    <tr key={student.id}>
                      <td className="py-3 font-medium">{student.fullName}</td>
                      <td className="py-3 text-muted-foreground">{student.guardianName ?? "-"}</td>
                      <td className="py-3">{student.phone}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(student.joiningDate)}</td>
                      <td className="py-3">
                        {latestPayment ? (
                          <Badge tone={latestPayment.status === "PAID" ? "green" : "amber"}>
                            {latestPayment.status.toLowerCase()}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No payments</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge tone={student.status === "ACTIVE" ? "green" : "neutral"}>
                          {student.status.toLowerCase()}
                        </Badge>
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
