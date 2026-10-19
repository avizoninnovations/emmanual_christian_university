import { Skeleton } from "@workspace/ui/components/skeleton";
import { TableCell, TableRow } from "@workspace/ui/components/table";

export function TableSkeletonRows({ columns, rows = 4 }: { columns: number; rows?: number }) {
  const columnWidths = ["w-20", "w-32", "w-24", "w-16", "w-20", "w-24", "w-14", "w-28", "w-16"];

  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column}>
              <Skeleton className={`h-4 max-w-full ${columnWidths[column % columnWidths.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
      <TableRow className="sr-only"><TableCell colSpan={columns}>Loading table data</TableCell></TableRow>
    </>
  );
}
