import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  bucket: "avatars" | "worker-gallery" | "review-photos" | "worker-docs";
  userId: string;
  value?: string | null;
  onUploaded: (url: string, path: string) => void;
  onRemove?: () => void;
  label?: string;
  shape?: "circle" | "square";
  className?: string;
  accept?: string;
  maxSizeMB?: number;
};

export function ImageUpload({
  bucket,
  userId,
  value,
  onUploaded,
  onRemove,
  label = "Upload image",
  shape = "square",
  className = "",
  accept = "image/*",
  maxSizeMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB`);
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl, path);
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {value ? (
        <div className="relative">
          <img src={value} alt="" className={`h-20 w-20 border border-border object-cover ${rounded}`} />
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className={`grid h-20 w-20 place-items-center border border-dashed border-border bg-secondary/40 text-muted-foreground ${rounded}`}>
          <Upload className="h-5 w-5" />
        </div>
      )}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          {busy ? "Uploading…" : value ? "Change" : label}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">Max {maxSizeMB}MB · JPG, PNG, WEBP</p>
      </div>
    </div>
  );
}