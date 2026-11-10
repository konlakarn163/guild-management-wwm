"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIME_OPTIONS } from "@/lib/war-time";

interface TimeRangeSelectProps {
  from: string;
  until: string;
  onChange: (from: string, until: string) => void;
  fromPlaceholder?: string;
  untilPlaceholder?: string;
  className?: string;
}

export function TimeRangeSelect({
  from,
  until,
  onChange,
  fromPlaceholder = "เริ่ม",
  untilPlaceholder = "ถึง",
  className,
}: TimeRangeSelectProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Select
        value={from || undefined}
        onValueChange={(value) => onChange(value, until && until <= value ? "" : until)}
      >
        <SelectTrigger className="h-9 w-24 rounded-lg">
          <SelectValue placeholder={fromPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-slate-400">–</span>
      <Select value={until || undefined} onValueChange={(value) => onChange(from, value)}>
        <SelectTrigger className="h-9 w-24 rounded-lg">
          <SelectValue placeholder={untilPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {TIME_OPTIONS.filter((time) => !from || time > from).map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
