import { notFound } from "next/navigation";
import { ArrowUpRight, ClipboardList, Info } from "lucide-react";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { staffWorkspaces } from "./staff-workspace-content";

export function StaffWorkspaceView({ workspace }: { workspace: string }) {
  const page = staffWorkspaces[workspace];
  if (!page) notFound();

  return <main className="min-h-full min-w-0 space-y-6 p-4 md:p-6">
    <header className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Staff <span className="px-1">/</span> {page.title}</p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
        <Badge variant="secondary">Workspace outline</Badge>
      </div>
      <p className="max-w-3xl text-sm text-muted-foreground">{page.summary}</p>
    </header>

    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>This page maps the information and workflow areas for review. Live records and actions will be connected after the ECU workflow is confirmed.</p>
      </CardContent>
    </Card>

    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {page.sections.map((section) => <Card key={section.title} className="min-w-0 rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="size-4" /></span>
            <div className="min-w-0"><CardTitle className="text-base">{section.title}</CardTitle><CardDescription className="mt-1">{section.description}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {section.fields.map((field) => <Badge key={field} variant="outline" className="rounded-full px-3 py-1 font-normal">{field}</Badge>)}
        </CardContent>
      </Card>)}
    </div>

    {workspace === "my-teaching" && <Button asChild variant="outline"><Link href="/courses">Open teaching courses <ArrowUpRight className="size-4" /></Link></Button>}
  </main>;
}
