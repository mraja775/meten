import { MessageTemplate, MessageType } from "@prisma/client";
import { Send } from "lucide-react";
import { createMessageAction } from "@/app/(app)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSessionContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export default async function MessagesPage() {
  const session = await getSessionContext();
  const [students, messages] = await prisma.$transaction([
    prisma.student.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null,
        status: "ACTIVE"
      },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, guardianName: true }
    }),
    prisma.message.findMany({
      where: {
        academyId: session.academyId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        recipients: {
          where: { deletedAt: null },
          take: 3
        }
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compose reminders and keep a communication history. Provider sending comes later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMessageAction} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <select name="type" className="h-9 rounded-md border bg-background px-3 text-sm">
                {Object.values(MessageType).map((type) => (
                  <option key={type} value={type}>
                    {label(type)}
                  </option>
                ))}
              </select>
              <select name="template" className="h-9 rounded-md border bg-background px-3 text-sm">
                {Object.values(MessageTemplate).map((template) => (
                  <option key={template} value={template}>
                    {label(template)}
                  </option>
                ))}
              </select>
              <select
                name="studentId"
                className="h-9 rounded-md border bg-background px-3 text-sm sm:col-span-2"
                required
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                    {student.guardianName ? ` (${student.guardianName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <Input name="subject" placeholder="Subject for email, optional" aria-label="Subject" />
            <textarea
              name="body"
              className="min-h-36 rounded-md border bg-background p-3 text-sm"
              defaultValue="Hi {{guardianName}}, this is a reminder from the academy."
              aria-label="Message body"
              required
            />
            <div>
              <Button type="submit">
                <Send className="h-4 w-4" />
                Record Message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{label(message.type)}</Badge>
                  <Badge tone="green">{label(message.status)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{message.body}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  To:{" "}
                  {message.recipients.map((recipient) => recipient.recipientName).join(", ") ||
                    "No recipients"}
                </div>
              </div>
            ))}
            {messages.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No messages recorded yet.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
