import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { downloadICS, type ICSEvent } from "@/lib/ics";

export function AddToCalendarButton({ event, variant = "outline", size = "sm", className }: {
  event: ICSEvent;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <Button type="button" variant={variant} size={size} className={className}
      onClick={() => downloadICS(event)}>
      <CalendarPlus className="mr-1 h-4 w-4" /> Add to Calendar
    </Button>
  );
}
