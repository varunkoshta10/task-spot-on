import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { StarRating } from "@/components/StarRating";
import { ArrowLeft, Send, MapPin, Image as ImageIcon, Calendar, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings/$bookingId")({
  component: BookingDetail,
});

function BookingDetail() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const booking = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, worker:worker_profiles(id, user_id, headline, profile:profiles(full_name, avatar_url), category:categories(name)), customer:profiles!bookings_customer_id_fkey(full_name, avatar_url)")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as any;
    },
  });

  const messages = useQuery({
    queryKey: ["messages", bookingId],
    queryFn: async () => (await supabase.from("messages").select("*").eq("booking_id", bookingId).order("created_at")).data ?? [],
  });

  // Realtime: messages + booking + worker location
  useEffect(() => {
    const ch = supabase
      .channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", bookingId] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, () => {
        qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [bookingId, qc]);

  // Live worker location
  const workerId = booking.data?.worker?.id;
  const workerLoc = useQuery({
    queryKey: ["worker-loc", workerId],
    enabled: !!workerId && (booking.data?.status === "accepted" || booking.data?.status === "in_progress"),
    queryFn: async () => (await supabase.from("worker_locations").select("*").eq("worker_id", workerId!).maybeSingle()).data,
    refetchInterval: 15000,
  });
  useEffect(() => {
    if (!workerId) return;
    const ch = supabase
      .channel(`worker-loc-${workerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_locations", filter: `worker_id=eq.${workerId}` }, () => {
        qc.invalidateQueries({ queryKey: ["worker-loc", workerId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [workerId, qc]);

  const b = booking.data;
  const isCustomer = !!user && b?.customer_id === user.id;

  // Chat send
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: async ({ body, image_url }: { body?: string; image_url?: string }) => {
      const { error } = await supabase.from("messages").insert({
        booking_id: bookingId,
        sender_id: user!.id,
        body: body ?? null,
        image_url: image_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
    onError: (e: any) => toast.error(e.message),
  });

  // Mark other-party messages as read
  useEffect(() => {
    if (!user || !messages.data) return;
    const unread = messages.data.filter((m: any) => m.sender_id !== user.id && !m.read_at).map((m: any) => m.id);
    if (unread.length) {
      supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(() => {});
    }
  }, [messages.data, user]);

  // Cancel (customer only)
  const cancel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Booking cancelled"); qc.invalidateQueries({ queryKey: ["booking", bookingId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  // Review (customer only, after completed)
  const existingReview = useQuery({
    queryKey: ["review-for-booking", bookingId],
    enabled: !!b && b.status === "completed" && isCustomer,
    queryFn: async () => (await supabase.from("reviews").select("*").eq("booking_id", bookingId).maybeSingle()).data,
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!b) return;
      const { error } = await supabase.from("reviews").insert({
        booking_id: bookingId,
        customer_id: user!.id,
        worker_id: b.worker_id,
        rating,
        comment: comment || null,
        photos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for your review!");
      qc.invalidateQueries({ queryKey: ["review-for-booking", bookingId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (booking.isLoading) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">Loading…</div>;
  if (!b) return <div className="mx-auto max-w-3xl px-6 py-16 text-center">Booking not found.</div>;

  const otherName = isCustomer ? b.worker?.profile?.full_name ?? "Pro" : b.customer?.full_name ?? "Customer";
  const otherAvatar = isCustomer ? b.worker?.profile?.avatar_url : b.customer?.avatar_url;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link to={isCustomer ? "/dashboard" : "/worker-dashboard"} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* Header card */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-semibold">
              {otherAvatar ? <img src={otherAvatar} alt="" className="h-full w-full object-cover" /> : (otherName[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-primary">{b.worker?.category?.name}</div>
              <div className="font-display text-lg font-semibold">{otherName}</div>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[b.status] ?? ""}`}>{b.status.replace("_", " ")}</span>
        </div>

        <p className="mt-4 text-sm">{b.service_description}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {b.scheduled_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(b.scheduled_at).toLocaleString()}</span>}
          {b.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{b.address}</span>}
          {b.quoted_price && <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{b.quoted_price} (quoted)</span>}
          {b.final_price && <span className="inline-flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />{b.final_price} (final)</span>}
        </div>

        {isCustomer && ["pending", "accepted"].includes(b.status) && (
          <div className="mt-4">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => cancel.mutate()}>Cancel booking</Button>
          </div>
        )}
      </div>

      {/* Live location */}
      {["accepted", "in_progress"].includes(b.status) && workerLoc.data && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Live location</h2>
          <p className="mt-1 text-xs text-muted-foreground">Last updated {new Date(workerLoc.data.updated_at).toLocaleTimeString()}</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-border">
            <iframe
              title="Worker location"
              src={`https://maps.google.com/maps?q=${workerLoc.data.latitude},${workerLoc.data.longitude}&z=15&output=embed`}
              className="h-64 w-full"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="mt-6 rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold">Chat with {otherName}</h2>
        </div>
        <div ref={listRef} className="max-h-[420px] min-h-[240px] space-y-3 overflow-y-auto px-6 py-4">
          {messages.data?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Say hello — messages are end-to-end between you two.</p>
          )}
          {messages.data?.map((m: any) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {m.image_url && <img src={m.image_url} alt="" className="mb-1 max-h-64 rounded-lg" />}
                  {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && m.read_at && " · read"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate({ body: text.trim() }); }}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          {user && (
            <ImageUpload
              bucket="review-photos"
              userId={user.id}
              value={null}
              onUploaded={(url) => send.mutate({ image_url: url })}
              shape="square"
              label={<ImageIcon className="h-4 w-4" />}
              compact
            />
          )}
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" />
          <Button type="submit" size="icon" className="rounded-full" disabled={!text.trim() || send.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Review */}
      {isCustomer && b.status === "completed" && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-semibold">Rate your experience</h2>
          {existingReview.data ? (
            <div className="mt-3">
              <StarRating value={existingReview.data.rating} />
              {existingReview.data.comment && <p className="mt-2 text-sm">{existingReview.data.comment}</p>}
              {existingReview.data.photos?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {existingReview.data.photos.map((p: string) => (
                    <img key={p} src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">Thanks — your review is live.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className={`h-9 w-9 rounded-full text-lg ${n <= rating ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>★</button>
                ))}
              </div>
              <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the service?" />
              {user && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p} className="relative">
                      <img src={p} alt="" className="h-20 w-20 rounded-lg object-cover" />
                      <button type="button" onClick={() => setPhotos(photos.filter((x) => x !== p))} className="absolute right-1 top-1 rounded-full bg-background/90 px-1 text-xs">×</button>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <ImageUpload
                      bucket="review-photos"
                      userId={user.id}
                      value={null}
                      onUploaded={(url) => setPhotos([...photos, url])}
                      shape="square"
                      label="Add photo"
                    />
                  )}
                </div>
              )}
              <Button onClick={() => submitReview.mutate()} disabled={submitReview.isPending} className="rounded-full">Post review</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-warm/20 text-warm-foreground",
  accepted: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive",
};