import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { staffWorkspaces } from "./staff-workspace-content";

export function StaffWorkspaceView({ workspace }: { workspace: string }) {
  const page = staffWorkspaces[workspace];
  if (!page) notFound();

  return <main className="min-h-full min-w-0 space-y-5 p-3 md:p-5">
    <div className="grid min-w-0 gap-3 xl:grid-cols-2">
      {page.sections.map((section) => <Card key={section.title} className="min-w-0 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" /></span>
            <CardTitle className="min-w-0 text-base">{section.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {section.fields.map((field) => <Badge key={field} variant="outline" className="rounded-md px-2.5 py-1 font-normal">{field}</Badge>)}
        </CardContent>
      </Card>)}
    </div>
  </main>;
}
