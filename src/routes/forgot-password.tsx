import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Skillora" },
      { name: "description", content: "Enter your email and we'll send you a link to reset your Skillora password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPassword,
});

const emailSchema = z.string().trim().email({ message: "Enter a valid email" }).max(255);

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = emailSchema.safeParse(email);
    if (!r.success) return toast.error(r.error.issues[0]!.message);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(r.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for the reset link.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-6 py-12">
      <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-display font-bold">Forgot your password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we'll send you a link to set a new one.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm">
            We sent a reset link to <strong>{email}</strong>. Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full">
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Remembered it? <Link to="/auth" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}