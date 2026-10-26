import type { Id } from "@workspace/backend/_generated/dataModel";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Clock, MapPin, Users } from "lucide-react";

type TimetableSlot = {
  _id: Id<"timetables">;
  courseCode: string;
  courseTitle: string;
  dayOfWeek:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday";
  startTime: string;
  endTime: string;
  room: string;
  building?: string;
  lecturerName?: string;
};

const WEEKDAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
] as const;

type TimeBlock = { startTime: string; endTime: string; key: string };

function getTimeBlocks(slots: TimetableSlot[]): TimeBlock[] {
  const blocks = new Map<string, TimeBlock>();
  for (const slot of slots) {
    const key = `${slot.startTime}-${slot.endTime}`;
    blocks.set(key, { key, startTime: slot.startTime, endTime: slot.endTime });
  }
  return [...blocks.values()].sort(
    (a, b) =>
      a.startTime.localeCompare(b.startTime) ||
      a.endTime.localeCompare(b.endTime),
  );
}

function getSlotAtTime(slots: TimetableSlot[], day: string, block: TimeBlock) {
  return slots.filter(
    (slot) =>
      slot.dayOfWeek === day &&
      slot.startTime === block.startTime &&
      slot.endTime === block.endTime,
  );
}

function LessonCell({ slot }: { slot: TimetableSlot }) {
  return (
    <div className="min-w-40 space-y-2 border-l-2 border-primary/70 pl-3 py-1">
      <div>
        <p className="font-mono text-xs font-semibold text-primary">
          {slot.courseCode}
        </p>
        <p className="mt-0.5 font-semibold leading-snug text-foreground">
          {slot.courseTitle}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="font-mono tabular-nums">
          {slot.startTime}–{slot.endTime}
        </span>
      </div>
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {slot.room}
          {slot.building ? ` · ${slot.building}` : ""}
        </span>
      </div>
      {slot.lecturerName ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5 shrink-0" aria-hidden="true" />
          <span>{slot.lecturerName}</span>
        </div>
      ) : null}
    </div>
  );
}

export function WeeklyTimetableGrid({
  slots,
  canManage,
  onDelete,
}: {
  slots: TimetableSlot[];
  canManage: boolean;
  onDelete: (slot: TimetableSlot) => void;
}) {
  const timeBlocks = getTimeBlocks(slots);

  if (timeBlocks.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed bg-muted/15 px-6 text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Clock className="size-5" aria-hidden="true" />
        </span>
        <p className="font-medium">No classes scheduled</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Scheduled courses will appear here by day and time.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border border-border/70">
      <Table className="min-w-[1120px]">
        <TableHeader>
          <TableRow className="bg-primary/10 hover:bg-primary/10">
            <TableHead className="sticky left-0 z-10 w-36 bg-primary/10 px-4 py-4 font-semibold text-foreground">
              Time
            </TableHead>
            {WEEKDAYS.map((day) => (
              <TableHead
                key={day.key}
                className="min-w-44 px-4 py-4 text-center font-semibold uppercase tracking-wide text-foreground"
              >
                {day.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeBlocks.map((block) => (
            <TableRow key={block.key} className="align-top">
              <TableCell className="sticky left-0 z-10 bg-background px-4 py-4 align-top">
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {block.startTime}
                </p>
                <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                  {block.endTime}
                </p>
              </TableCell>
              {WEEKDAYS.map((day) => {
                const daySlots = getSlotAtTime(slots, day.key, block);
                return (
                  <TableCell key={day.key} className="px-3 py-3 align-top">
                    {daySlots.length ? (
                      <div className="space-y-3">
                        {daySlots.map((slot) => (
                          <div
                            key={slot._id}
                            className="group relative rounded-md bg-muted/30 p-3 transition-colors hover:bg-primary/5"
                          >
                            <LessonCell slot={slot} />
                            {canManage ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Remove ${slot.courseCode} from timetable`}
                                onClick={() => onDelete(slot)}
                                className="absolute right-2 top-2 h-7 rounded-sm px-2 text-xs text-muted-foreground hover:text-destructive print:hidden"
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="block min-h-16 py-3 text-center text-xs text-muted-foreground/60">
                        —
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between gap-4 border-t bg-muted/15 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Weekly teaching schedule</span>
        <Badge variant="secondary" className="rounded-sm font-mono">
          {slots.length} {slots.length === 1 ? "class" : "classes"}
        </Badge>
      </div>
    </div>
  );
}
