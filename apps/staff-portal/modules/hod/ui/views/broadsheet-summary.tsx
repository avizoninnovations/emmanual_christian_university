import { Card, CardContent } from "@workspace/ui/components/card";
import type { BroadsheetSummary } from "./broadsheet-types";

type BroadsheetSummaryProps = { summary: BroadsheetSummary };

export function BroadsheetSummaryStrip({ summary }: BroadsheetSummaryProps) {
  const items = [
    { label: "Candidates", value: summary.totalCandidates },
    { label: "With published marks", value: summary.candidatesEvaluated },
    { label: "Clear passes", value: summary.clearPassCount },
    { label: "Supplementary", value: summary.supplementaryCount },
    { label: "Repeat / probation", value: summary.repeatCount },
    { label: "Mean semester GPA", value: summary.averageGPA.toFixed(2) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label} className="rounded-sm shadow-none">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
