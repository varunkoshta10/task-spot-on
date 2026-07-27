import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPhoneVerificationStatus, sendPhoneOtp, verifyPhoneOtp } from "@/lib/phone.functions";

export const Route = createFileRoute("/_authenticated/verify-phone")({
  head: () => ({
    meta: [
      { title: "Verify your phone — Skillora" },
      { name: "description", content: "Confirm your mobile number with a one-time code to start booking pros on Skillora." },
      { property: "og:title", content: "Verify your phone — Skillora" },
      { property: "og:description", content: "Confirm your mobile number with a one-time code to start booking pros on Skillora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyPhone,
});

function VerifyPhone() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statusFn = useServerFn(getPhoneVerificationStatus);
  const sendFn = useServerFn(sendPhoneOtp);
  const verifyFn = useServerFn(verifyPhoneOtp);

  const { data: status } = useQuery({ queryKey: ["phone-status"], queryFn: () => statusFn({}) });

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: async () => sendFn({ data: { phone: phone.trim() } }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.error);
      setSent(true);
      toast.success("Code sent — check your messages.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send the code"),
  });

  const verify = useMutation({
    mutationFn: async () => verifyFn({ data: { phone: phone.trim(), code: code.trim() } }),
    onSuccess: (r) => {
      if (!r.ok) return toast.error(r.error);
      toast.success("Phone verified!");
      qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not verify the code"),
  });

  if (status?.verified) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-display font-bold">Phone verified</h1>
        <p className="mt-2 text-muted-foreground">{status.phone} is confirmed. You're all set to book pros.</p>
        <Button className="mt-6 rounded-full" onClick={() => navigate({ to: "/browse" })}>Find a pro</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Smartphone className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-2xl font-display font-bold">Verify your phone</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We send a 6-digit code by SMS. Verified numbers keep bookings safe for both customers and pros.
      </p>

      <div className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            disabled={sent}
          />
          <p className="mt-1 text-xs text-muted-foreground">Include your country code.</p>
        </div>

        {sent && (
          <div>
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
        )}

        {sent ? (
          <div className="space-y-2">
            <Button
              className="w-full rounded-full"
              size="lg"
              disabled={verify.isPending || code.length !== 6}
              onClick={() => verify.mutate()}
            >
              {verify.isPending ? "Verifying…" : "Verify"}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-full"
              disabled={send.isPending}
              onClick={() => send.mutate()}
            >
              Resend code
            </Button>
            <Button variant="ghost" className="w-full rounded-full" onClick={() => { setSent(false); setCode(""); }}>
              Change number
            </Button>
          </div>
        ) : (
          <Button
            className="w-full rounded-full"
            size="lg"
            disabled={send.isPending || phone.trim().length < 8}
            onClick={() => send.mutate()}
          >
            {send.isPending ? "Sending…" : "Send code"}
          </Button>
        )}
      </div>
    </div>
  );
}