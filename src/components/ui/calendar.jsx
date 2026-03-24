import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-6 pl-24 bg-white text-slate-900 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-200 font-serif relative", className)}
            classNames={{
                root: cn("", classNames?.root),
                months: cn("flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0", classNames?.months),
                month: cn("space-y-4", classNames?.month),
                month_caption: cn("flex justify-start pt-1 relative items-center mb-4 pl-2", classNames?.month_caption),
                caption_label: cn("text-[16px] font-normal text-slate-800", classNames?.caption_label),
                nav: cn("absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3 z-10", classNames?.nav),
                button_previous: cn("h-8 w-8 bg-transparent p-0 hover:opacity-70 flex items-center justify-center transition-opacity", classNames?.button_previous),
                button_next: cn("h-8 w-8 bg-transparent p-0 hover:opacity-70 flex items-center justify-center transition-opacity", classNames?.button_next),
                month_grid: cn("w-full border-collapse space-y-2", classNames?.month_grid),
                weekdays: cn("flex", classNames?.weekdays),
                weekday: cn("text-slate-900 rounded-md w-10 font-bold text-[15px] font-normal", classNames?.weekday),
                week: cn("flex w-full mt-2", classNames?.week),
                day: cn("h-10 w-10 text-center text-[15px] p-0 relative focus-within:relative focus-within:z-20", classNames?.day),
                day_button: cn("absolute inset-0 w-full h-full p-0 flex items-center justify-center font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-md transition-colors text-slate-700", classNames?.day_button),
                range_start: cn("day-range-start", classNames?.range_start),
                range_end: cn("day-range-end", classNames?.range_end),
                selected: cn("bg-[#FA5A28] text-white hover:bg-[#e04a1e] hover:text-white focus:bg-[#FA5A28] focus:text-white shadow-md font-bold", classNames?.selected),
                today: cn("bg-slate-100 text-slate-900", classNames?.today),
                outside: cn("day-outside text-slate-400 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30", classNames?.outside),
                disabled: cn("text-slate-400 opacity-50", classNames?.disabled),
                range_middle: cn("aria-selected:bg-slate-100 aria-selected:text-slate-900", classNames?.range_middle),
                hidden: cn("invisible", classNames?.hidden),
            }}
            components={{
                Chevron: ({ orientation, className }) => {
                    const Component = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Component className={cn("h-6 w-6 stroke-[3px] text-slate-900", className)} />;
                },
            }}
            {...props} />
    );
}
Calendar.displayName = "Calendar"

export { Calendar }
