"use client";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Plus, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { StaffDataSkeleton } from "@/modules/dashboard/ui/components/staff-data-skeleton";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Sheet,
  WideSheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@workspace/ui/components/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { WeeklyTimetableGrid } from "@/modules/staff/ui/components/weekly-timetable-grid";

export function LecturerTimetableView() {
  const { roles } = useCurrentUser();
  const isHodOrAdmin = Boolean(
    roles?.some((role: string) =>
      ["admin", "hod", "dean"].includes(role.toLowerCase()),
    ),
  );

  const [activeTab, setActiveTab] = useState<"my" | "dept">("my");
  const [scheduleSheetOpen, setScheduleSheetOpen] = useState(false);

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [room, setRoom] = useState("Main Hall A");
  const [building, setBuilding] = useState("Main Academic Complex");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mySlots = useQuery(api.timetable.getLecturerTimetable, {});
  const deptSlots = useQuery(api.timetable.getDepartmentTimetable, {});
  const allCourses = useQuery(api.courses.getCourses, {});
  const periods = useQuery(api.broadsheet.getProgramsAndPeriods);

  const createSlot = useMutation(api.timetable.createTimetableSlot);
  const deleteSlot = useMutation(api.timetable.deleteTimetableSlot);

  const activeSlots = activeTab === "my" ? mySlots || [] : deptSlots || [];

  const handleCreateSlot = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course to schedule.");
      return;
    }
    const activePeriod =
      periods?.periods.find((p: any) => p.status === "active") ||
      periods?.periods[0];
    if (!activePeriod) {
      toast.error("No active academic period available.");
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedCourse = allCourses?.find(
        (c: any) => c._id === selectedCourseId,
      );
      const lecturerId = (selectedCourse as any)?.lecturerId || "system";

      await createSlot({
        courseId: selectedCourseId as Id<"courses">,
        periodId: activePeriod._id,
        lecturerId,
        dayOfWeek: selectedDay as any,
        startTime,
        endTime,
        room,
        building,
      });

      toast.success("Timetable slot scheduled successfully");
      setScheduleSheetOpen(false);
    } catch (err: any) {
      toast.error(getUserFacingErrorMessage(err, "Failed to schedule slot"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: Id<"timetables">) => {
    try {
      await deleteSlot({ id });
      toast.success("Schedule slot removed");
    } catch (err: any) {
      toast.error(getUserFacingErrorMessage(err, "Failed to remove slot"));
    }
  };

  if (!mySlots) {
    return <StaffDataSkeleton label="weekly teaching timetable" />;
  }

  return (
    <div className="w-full min-w-0 space-y-5 p-4 lg:p-6 print:p-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Teaching Timetable & Schedules
            </h1>
            <Badge variant="outline" className="text-xs uppercase">
              Weekly Grid
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isHodOrAdmin && (
            <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={activeTab === "my" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("my")}
                className="h-8 text-xs"
              >
                My Lectures
              </Button>
              <Button
                variant={activeTab === "dept" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("dept")}
                className="h-8 text-xs"
              >
                Department Timetable
              </Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="size-3.5" /> Print Timetable
          </Button>

          {isHodOrAdmin && (
            <Button
              size="sm"
              onClick={() => setScheduleSheetOpen(true)}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" /> Schedule Class
            </Button>
          )}
        </div>
      </div>

      <WeeklyTimetableGrid
        slots={activeSlots}
        canManage={isHodOrAdmin}
        onDelete={(slot) => void handleDeleteSlot(slot._id)}
      />

      {/* ── Schedule Lecture Sheet ── */}
      <Sheet open={scheduleSheetOpen} onOpenChange={setScheduleSheetOpen}>
        <WideSheetContent>
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              Schedule Lecture Session
            </SheetTitle>
            <SheetDescription className="text-xs">
              Assign course time and room. The system will automatically check
              for room and lecturer collisions.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Course Select */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Course Unit</label>
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {allCourses?.map((c) => (
                    <SelectItem key={c._id} value={c._id} className="text-xs">
                      {c.code}: {c.title} ({c.creditUnits} CU)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day Select */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Day of Week</label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { key: "monday", label: "Monday" },
                    { key: "tuesday", label: "Tuesday" },
                    { key: "wednesday", label: "Wednesday" },
                    { key: "thursday", label: "Thursday" },
                    { key: "friday", label: "Friday" },
                    { key: "saturday", label: "Saturday" },
                  ].map((d) => (
                    <SelectItem key={d.key} value={d.key} className="text-xs">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Start Time (HH:MM)
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  End Time (HH:MM)
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>

            {/* Room & Building */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Lecture Room / Hall
                </label>
                <Input
                  value={room}
                  placeholder="e.g. Main Hall A"
                  onChange={(e) => setRoom(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Building / Wing
                </label>
                <Input
                  value={building}
                  placeholder="e.g. Academic Block"
                  onChange={(e) => setBuilding(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleSheetOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateSlot}
              disabled={isSubmitting}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Save Schedule Slot
            </Button>
          </SheetFooter>
        </WideSheetContent>
      </Sheet>
    </div>
  );
}
