import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function NotificationsBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = (q.data ?? []).filter((n: any) => !n.read_at).map((n: any) => n.id);
      if (!ids.length) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  if (!user) return null;
  const unread = (q.data ?? []).filter((n: any) => !n.read_at).length;

  return (
    <DropdownMenu onOpenChange={(o) => { if (o && unread) markAll.mutate(); }}>
      <DropdownMenuTrigger asChild>
        <button className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-secondary" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {(!q.data || q.data.length === 0) && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
          )}
          {q.data?.map((n: any) => (
            <Link
              key={n.id}
              to={n.link ?? "/dashboard"}
              className={`block border-b border-border/60 px-4 py-3 hover:bg-secondary ${!n.read_at ? "bg-primary/5" : ""}`}
            >
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}