import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function EventFeedback({ eventId, endsAt, isAttendee }: { eventId: string; endsAt: string; isAttendee: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const ended = new Date(endsAt) < new Date();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const { data: mine } = useQuery({
    queryKey: ["my-feedback", eventId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("event_feedback").select("*").eq("event_id", eventId).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: list } = useQuery({
    queryKey: ["feedback", eventId],
    queryFn: async () => {
      const { data } = await supabase.from("event_feedback")
        .select("id, rating, comment, created_at, user_id, profiles:user_id(display_name, avatar_url)")
        .eq("event_id", eventId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!user || rating < 1) return;
    const { error } = await supabase.from("event_feedback").insert({
      event_id: eventId, user_id: user.id, rating, comment: comment.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Thanks for your feedback!");
    setRating(0); setComment("");
    qc.invalidateQueries({ queryKey: ["my-feedback", eventId] });
    qc.invalidateQueries({ queryKey: ["feedback", eventId] });
  };

  const avg = list && list.length > 0 ? (list.reduce((s, f: any) => s + f.rating, 0) / list.length).toFixed(1) : null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Feedback</h3>
        {avg && <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-accent text-accent" />{avg} · {list!.length}</div>}
      </div>

      {ended && isAttendee && !mine && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star className={`h-7 w-7 ${(hover || rating) >= n ? "fill-accent text-accent" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Share your thoughts (optional)" value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} />
          <Button onClick={submit} disabled={rating < 1}>Submit feedback</Button>
        </div>
      )}
      {!ended && <p className="mt-3 text-sm text-muted-foreground">Feedback opens after the event ends.</p>}
      {ended && !isAttendee && !mine && <p className="mt-3 text-sm text-muted-foreground">Only attendees can leave feedback.</p>}
      {mine && <p className="mt-3 text-sm text-muted-foreground">You rated this event {mine.rating}/5 — thanks!</p>}

      <div className="mt-4 space-y-3">
        {list?.map((f: any) => (
          <div key={f.id} className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{f.profiles?.display_name ?? "Attendee"}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {Array.from({ length: f.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
                <span className="ml-2">{format(new Date(f.created_at), "PP")}</span>
              </div>
            </div>
            {f.comment && <p className="mt-1 text-sm text-foreground/80">{f.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
