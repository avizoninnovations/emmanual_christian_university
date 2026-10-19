import { Skeleton } from "@workspace/ui/components/skeleton";

export function AuthLoadingSkeleton() {
  return (
    <div className="flex min-h-dvh bg-muted/30" role="status" aria-label="Loading staff portal">
      <aside className="hidden w-64 shrink-0 space-y-6 bg-card p-4 md:block">
        <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><Skeleton className="h-4 w-28" /></div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-px w-full" />
        <div className="flex items-center gap-3"><Skeleton className="size-9 rounded-full" /><Skeleton className="h-4 w-24" /></div>
        <div className="space-y-3 pt-3">
          {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-10 w-full rounded-lg" />)}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex h-[72px] items-center gap-4 bg-transparent px-4 md:px-6">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <div className="ml-auto flex gap-2"><Skeleton className="size-8 rounded-full" /><Skeleton className="size-8 rounded-full" /></div>
        </header>
        <div className="space-y-5 p-4 md:p-6">
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </main>
      <span className="sr-only">Loading</span>
    </div>
  );
}
