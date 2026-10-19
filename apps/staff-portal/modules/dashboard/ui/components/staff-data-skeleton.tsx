import { Skeleton } from "@workspace/ui/components/skeleton";

export function StaffDataSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6" role="status" aria-label={`Loading ${label}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-80 max-w-full" /></div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <div className="rounded-xl bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between"><Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-52 rounded-md" /></div>
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center gap-4"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-20" /></div>)}
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
