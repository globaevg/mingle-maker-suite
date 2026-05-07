import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { ReportButton } from "@/components/ReportButton";

const BUCKET = "event-photos";

function publicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function EventGallery({ eventId, isAttendee }: { eventId: string; isAttendee: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos } = useQuery({
    queryKey: ["gallery", eventId, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("event_photos")
        .select("id, storage_path, status, user_id, created_at")
        .eq("event_id", eventId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("event_photos").insert({
      event_id: eventId, user_id: user.id, storage_path: path,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (error) return toast.error(error.message);
    toast.success("Uploaded — pending host approval");
    qc.invalidateQueries({ queryKey: ["gallery", eventId] });
  };

  const approved = photos?.filter(p => p.status === "approved") ?? [];
  const myPending = photos?.filter(p => p.status !== "approved" && p.user_id === user?.id) ?? [];

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><ImageIcon className="h-5 w-5 text-accent" />Gallery</h3>
        {isAttendee && (
          <>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="mr-1 h-4 w-4" />{uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </>
        )}
      </div>

      {approved.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No photos yet.</p>}
      {approved.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {approved.map(p => (
            <a key={p.id} href={publicUrl(p.storage_path)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-muted">
              <img src={publicUrl(p.storage_path)} alt="" className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
            </a>
          ))}
        </div>
      )}

      {myPending.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">Your pending uploads</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {myPending.map(p => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg">
                <img src={publicUrl(p.storage_path)} alt="" className="h-full w-full object-cover opacity-70" />
                <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px]">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
