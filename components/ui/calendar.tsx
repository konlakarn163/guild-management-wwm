"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        caption: "relative flex items-center justify-center px-10 pt-1",
        caption_label: "text-sm font-semibold text-slate-100",
        nav: "flex items-center gap-1",
        nav_button:
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        button_previous:
          "absolute left-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
        button_next:
          "absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
        table: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 text-center text-xs font-medium text-slate-400",
        week: "mt-2 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-md border border-transparent text-slate-100 hover:border-slate-700 hover:bg-slate-800",
        today: "text-amber-200",
        selected: "[&>button]:border-amber-300/60 [&>button]:bg-amber-400/15 [&>button]:text-amber-100",
        disabled: "opacity-40",
        outside: "opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", iconClassName)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", iconClassName)} />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
