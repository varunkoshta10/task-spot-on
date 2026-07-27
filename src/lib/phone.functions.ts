import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, { message: "Enter your number in international format, e.g. +919876543210" });

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => ({ phone: phoneSchema.parse(input.phone) }))
  .handler(async ({ data, context }) => {
    const { hashCode, generateCode, sendSms } = await import("./phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Rate limit: max 3 codes per 15 minutes per user
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return { ok: false as const, error: "Too many codes requested. Try again in a few minutes." };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin.from("phone_verifications").insert({
      user_id: userId,
      phone: data.phone,
      code_hash: hashCode(userId, data.phone, code),
      expires_at: expiresAt,
    });
    if (error) return { ok: false as const, error: "Could not start verification. Please try again." };

    const sent = await sendSms(data.phone, `Your Skillora verification code is ${code}. It expires in 10 minutes.`);
    if (!sent.ok) return { ok: false as const, error: sent.error };

    return { ok: true as const, expiresAt };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; code: string }) => ({
    phone: phoneSchema.parse(input.phone),
    code: z.string().trim().regex(/^\d{6}$/, { message: "Enter the 6-digit code" }).parse(input.code),
  }))
  .handler(async ({ data, context }) => {
    const { hashCode } = await import("./phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: row } = await supabaseAdmin
      .from("phone_verifications")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("user_id", userId)
      .eq("phone", data.phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "No pending code for this number. Request a new one." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "That code expired. Request a new one." };
    }
    if (row.attempts >= 5) {
      return { ok: false as const, error: "Too many attempts. Request a new code." };
    }

    if (row.code_hash !== hashCode(userId, data.phone, data.code)) {
      await supabaseAdmin
        .from("phone_verifications")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false as const, error: "Incorrect code." };
    }

    await supabaseAdmin
      .from("phone_verifications")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, phone: data.phone, phone_verified: true, phone_verified_at: nowIso });
    if (error) return { ok: false as const, error: "Could not save your verified number." };

    return { ok: true as const, phone: data.phone };
  });

export const getPhoneVerificationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("phone, phone_verified")
      .eq("id", context.userId)
      .maybeSingle();
    return { phone: data?.phone ?? null, verified: !!data?.phone_verified };
  });