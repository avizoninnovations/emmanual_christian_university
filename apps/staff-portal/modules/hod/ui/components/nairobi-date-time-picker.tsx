"use client";

import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";

const commonTimes = Array.from({ length: 48 }, (_, index) =>
  `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`);

export function toNairobiDateTimeInput(timestamp: number) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(timestamp).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function NairobiDateTimePicker({ value, onChange, label, clearable = false, ...formProps }: {
  value: string; onChange: (value: string) => void; label: string; clearable?: boolean;
} & Pick<ComponentPropsWithoutRef<"div">, "id" | "aria-describedby" | "aria-invalid">) {
  const [open, setOpen] = useState(false);
  const [date = "", time = ""] = value.split("T");
  const selectedDate = date ? new Date(`${date}T12:00:00`) : undefined;
  const times = time && !commonTimes.includes(time) ? [...commonTimes, time].sort() : commonTimes;
  const setDate = (nextDate: string) => onChange(`${nextDate}T${time || "23:59"}`);
  const setTime = (nextTime: string) => onChange(`${date}T${nextTime}`);

  return <div {...formProps} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
      <Button type="button" variant="outline" aria-label={label} className="w-full justify-start font-normal">
        <CalendarDays className="mr-2 size-4" />{date ? format(selectedDate!, "PPP") : "Choose a date"}
      </Button>
    </PopoverTrigger><PopoverContent align="start" className="w-auto p-0">
      <Calendar mode="single" selected={selectedDate} onSelect={day => { if (day) setDate(format(day, "yyyy-MM-dd")); setOpen(false); }}
        captionLayout="dropdown" fromYear={2020} toYear={2040} />
    </PopoverContent></Popover>
    <Select value={time || undefined} onValueChange={setTime} disabled={!date}>
      <SelectTrigger aria-label={`${label} time`}><SelectValue placeholder="Time (EAT)" /></SelectTrigger>
      <SelectContent className="max-h-60">{times.map(option => <SelectItem key={option} value={option}>{option} EAT</SelectItem>)}</SelectContent>
    </Select>
    {date && time && <Badge variant="secondary" className="w-fit sm:col-span-2">{date} · {time} East Africa Time</Badge>}
    {clearable && value && <Button type="button" variant="ghost" size="sm" className="w-fit sm:col-span-2" onClick={() => onChange("")}>Clear deadline</Button>}
  </div>;
}
