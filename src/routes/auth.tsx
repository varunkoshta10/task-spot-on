import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Skillora" },
      { name: "description", content: "Sign in or create your Skillora account to book pros or start earning as one." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Auth,
});

const emailSchema = z.string().trim().email({ message: "Enter a valid email" }).max(255);
const passwordSchema = z.string().min(6, { message: "At least 6 characters" }).max(72);

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function withGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Google sign-in failed");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailR = emailSchema.safeParse(email);
    const pwR = passwordSchema.safeParse(password);
    if (!emailR.success) return toast.error(emailR.error.issues[0]!.message);
    if (!pwR.success) return toast.error(pwR.error.issues[0]!.message);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailR.data,
          password: pwR.data,
          options: { data: { full_name: fullName || null }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: emailR.data, password: pwR.data });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-10 md:grid-cols-2">
        <div className="hidden flex-col justify-center md:flex">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </span>
          <h1 className="text-balance text-3xl font-display font-bold leading-tight md:text-4xl">
            The people who fix, teach and build — all in one place.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Book verified local pros for anything you need. Or join as a pro and start earning from bookings near you.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
          <div className="mb-6 flex gap-2 rounded-full bg-secondary p-1">
            <button onClick={() => setMode("signin")} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === "signin" ? "bg-background shadow" : "text-muted-foreground"}`}>Sign in</button>
            <button onClick={() => setMode("signup")} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-background shadow" : "text-muted-foreground"}`}>Create account</button>
          </div>

          <Button type="button" onClick={withGoogle} variant="outline" className="w-full rounded-full">
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            {mode === "signin" && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
            <Button type="submit" disabled={loading} size="lg" className="w-full rounded-full">
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to Skillora's terms and privacy policy.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Want to offer services? <Link to="/become-a-pro" className="font-medium text-primary hover:underline">Become a pro</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}