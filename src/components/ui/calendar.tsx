import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-black/40 rounded-lg shadow-lg backdrop-blur-md", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center text-cyan-400 font-semibold",
        caption_label: "text-sm font-bold tracking-wide",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-black/20 text-cyan-400 p-0 opacity-60 hover:opacity-100 hover:bg-cyan-500/10 transition-colors duration-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-cyan-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell:
          "h-9 w-9 text-center text-sm p-0 relative rounded-md focus-within:z-20 " +
          "[&:has([aria-selected].day-range-end)]:rounded-r-md " +
          "[&:has([aria-selected].day-outside)]:bg-cyan-900/20 " +
          "[&:has([aria-selected])]:bg-cyan-700/40 " +
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-cyan-300 aria-selected:opacity-100 hover:bg-cyan-500/10 hover:text-white transition-colors duration-200"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-gradient-to-r from-indigo-900/70 via-black/50 to-purple-900/70 text-cyan-400 hover:from-indigo-800/80 hover:to-purple-800/80 focus:bg-cyan-600 focus:text-white shadow-lg",
        day_today:
          "bg-cyan-700 text-white rounded-full shadow-md ring-1 ring-cyan-400 ring-offset-1",
        day_outside:
          "day-outside text-cyan-400 opacity-50 aria-selected:bg-cyan-700/30 aria-selected:text-cyan-200 aria-selected:opacity-70",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_middle: "aria-selected:bg-cyan-600/40 aria-selected:text-cyan-300",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4 text-cyan-400" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4 text-cyan-400" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
