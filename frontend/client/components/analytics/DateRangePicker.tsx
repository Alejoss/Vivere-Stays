import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

export type DateRangePickerProps = {
  range: DateRange | undefined;
  onChange: (next: DateRange | undefined) => void;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ range, onChange }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mb-4">
      <div className="text-lg font-semibold text-gray-700 mb-2">Date Range</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="w-40 justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.from ? format(range.from, "MMM d, yyyy") : "From"}
            </Button>
            <Button variant="outline" className="w-40 justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {range?.to ? format(range.to, "MMM d, yyyy") : "To"}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
          <Calendar
            mode="range"
            selected={range}
            onSelect={(r) => onChange(r)}
            numberOfMonths={2}
            defaultMonth={range?.from}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
