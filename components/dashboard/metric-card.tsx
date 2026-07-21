import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-normal">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{helper}</div>
      </CardContent>
    </Card>
  );
}
