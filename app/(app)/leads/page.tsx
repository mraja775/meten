import { LeadStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import {
  convertLeadAction,
  createLeadAction,
  updateLeadStatusAction
} from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statuses = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.TRIAL_SCHEDULED,
  LeadStatus.TRIAL_COMPLETED,
  LeadStatus.JOINED,
  LeadStatus.LOST
];

function statusLabel(status: LeadStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

export default async function LeadsPage() {
  const session = await getSessionContext();
  const leads = await prisma.lead.findMany({
    where: {
      academyId: session.academyId,
      deletedAt: null
    },
    orderBy: [{ followUpDate: "asc" }, { updatedAt: "desc" }],
    include: {
      assignedTo: { select: { name: true } }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track enquiries from first contact through admission.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLeadAction} className="grid gap-3 lg:grid-cols-6">
            <Input name="name" placeholder="Student name" aria-label="Student name" required />
            <Input name="phone" placeholder="Phone" aria-label="Phone" required />
            <Input name="parentName" placeholder="Parent name" aria-label="Parent name" />
            <Input name="studentAge" type="number" placeholder="Age" aria-label="Age" min={3} max={30} />
            <Input name="source" placeholder="Source" aria-label="Source" />
            <Input name="followUpDate" type="date" aria-label="Follow up date" />
            <textarea
              name="notes"
              className="min-h-20 rounded-md border bg-background p-3 text-sm lg:col-span-5"
              placeholder="Notes"
              aria-label="Notes"
            />
            <Button type="submit" className="lg:self-start">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {statuses.map((status) => {
          const columnLeads = leads.filter((lead) => lead.status === status);

          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="capitalize">{statusLabel(status)}</CardTitle>
                <Badge>{columnLeads.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {columnLeads.map((lead) => (
                  <div key={lead.id} className="rounded-md border p-3">
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {lead.parentName ? `${lead.parentName} · ` : ""}
                      {lead.phone}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Follow-up: {lead.followUpDate ? formatDate(lead.followUpDate) : "Not set"}
                    </div>
                    <div className="mt-3 grid gap-2">
                      <form action={updateLeadStatusAction} className="flex gap-2">
                        <input type="hidden" name="id" value={lead.id} />
                        <select
                          name="status"
                          defaultValue={lead.status}
                          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs"
                          aria-label={`Update ${lead.name} status`}
                        >
                          {statuses.map((option) => (
                            <option key={option} value={option}>
                              {statusLabel(option)}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="secondary" className="h-8 px-2 text-xs">
                          Save
                        </Button>
                      </form>
                      {lead.status !== LeadStatus.JOINED ? (
                        <form action={convertLeadAction}>
                          <input type="hidden" name="id" value={lead.id} />
                          <Button type="submit" variant="secondary" className="h-8 w-full text-xs">
                            Convert to Student
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
                {columnLeads.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No leads.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
