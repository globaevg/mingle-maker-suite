import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { toast } from "sonner";

type Props = {
  targetType: "event" | "photo";
  targetId: string;
  eventId: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline";
  label?: string;
};

export function ReportButton({ targetType, targetId, eventId, size = "sm", variant = "ghost", label }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) return toast.error("Sign in to report");
    setSubmitting(true);
    const { error } = await supabase.from("reports" as any).insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      event_id: eventId,
      reason: reason.trim(),
    } as any);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted. Thank you.");
    setReason("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}><Flag className="h-4 w-4" />{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Report this {targetType}</DialogTitle></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell the host what's wrong (optional)" rows={4} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
