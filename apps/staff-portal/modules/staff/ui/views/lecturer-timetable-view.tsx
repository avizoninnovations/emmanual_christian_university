"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Plus,
  Trash2,
  Printer,
  Loader2,
  BookOpen,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
] as const;

export function LecturerTimetableView() {
  const { roles } = useCurrentUser();
  const isHodOrAdmin = roles?.some((r: string) =>
    ["admin", "hod", "dean"].includes(r.toLowerCase())
  );

  const [activeTab, setActiveTab] = useState<"my" | "dept">("my");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

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
    const activePeriod = periods?.periods.find((p: any) => p.status === "active") || periods?.periods[0];
    if (!activePeriod) {
      toast.error("No active academic period available.");
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedCourse = allCourses?.find((c: any) => c._id === selectedCourseId);
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
      setScheduleDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule slot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (id: Id<"timetables">) => {
    try {
      await deleteSlot({ id });
      toast.success("Schedule slot removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove slot");
    }
  };

  if (!mySlots) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading weekly teaching timetable...</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full print:p-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Teaching Timetable & Schedules</h1>
            <Badge variant="outline" className="text-xs uppercase">
              Weekly Grid
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly lecture schedules, assigned lecture rooms, and automated collision detection.
          </p>
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

          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="size-3.5" /> Print Timetable
          </Button>

          {isHodOrAdmin && (
            <Button
              size="sm"
              onClick={() => setScheduleDialogOpen(true)}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" /> Schedule Class
            </Button>
          )}
        </div>
      </div>

      {/* ── Weekly Day Columns Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day) => {
          const daySlots = activeSlots.filter((s: any) => s.dayOfWeek === day.key);

          return (
            <Card key={day.key} className="shadow-sm border flex flex-col h-full">
              <CardHeader className="p-3.5 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm tracking-tight">{day.label}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {daySlots.length} Lecture{daySlots.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-3 space-y-3 flex-1">
                {daySlots.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    <span>No lectures scheduled</span>
                  </div>
                ) : (
                  daySlots.map((slot: any) => (
                    <div
                      key={slot._id}
                      className="p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold font-mono text-sm text-primary block">
                            {slot.courseCode}
                          </span>
                          <span className="text-xs font-medium text-foreground line-clamp-1">
                            {slot.courseTitle}
                          </span>
                        </div>
                        {isHodOrAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSlot(slot._id)}
                            className="size-6 text-muted-foreground hover:text-rose-600 print:hidden"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>

                      <div className="text-[11px] space-y-1 text-muted-foreground pt-1 border-t">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground" />
                          <span className="font-mono font-medium text-foreground">
                            {slot.startTime} – {slot.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-muted-foreground" />
                          <span>
                            {slot.room} {slot.building ? `(${slot.building})` : ""}
                          </span>
                        </div>
                        {(slot as any).lecturerName && (
                          <div className="flex items-center gap-1.5 text-foreground font-medium pt-0.5">
                            <Users className="size-3 text-muted-foreground" />
                            <span>{(slot as any).lecturerName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Schedule Lecture Dialog ── */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Schedule Lecture Session</DialogTitle>
            <DialogDescription className="text-xs">
              Assign course time and room. The system will automatically check for room and lecturer collisions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Course Select */}
            <div className="space-y-1">
              <label className="font-semibold block text-xs">Course Unit</label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
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
                  {DAYS.map((d) => (
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
                <label className="font-semibold block text-xs">Start Time (HH:MM)</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">End Time (HH:MM)</label>
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
                <label className="font-semibold block text-xs">Lecture Room / Hall</label>
                <Input
                  value={room}
                  placeholder="e.g. Main Hall A"
                  onChange={(e) => setRoom(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Building / Wing</label>
                <Input
                  value={building}
                  placeholder="e.g. Academic Block"
                  onChange={(e) => setBuilding(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScheduleDialogOpen(false)}
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
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Save Schedule Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
