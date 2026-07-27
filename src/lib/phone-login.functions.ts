import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, { message: "Enter your number in international format, e.g. +919876543210" });

const codeSchema = z.string().trim().regex(/^\d{6}$/, { message: "Enter the 6-digit code" });
const nameSchema = z.string().trim().min(2).max(80);

export const sendLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => ({ phone: phoneSchema.parse(input.phone) }))
  .handler(async ({ data }) => {
    const { hashLoginCode, generateCode, sendSms } = await import("./phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 3 codes per 15 minutes per number
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_login_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", data.phone)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return { ok: false as const, error: "Too many codes requested. Try again in a few minutes." };
    }

    const code = generateCode();
    const { error } = await supabaseAdmin.from("phone_login_codes").insert({
      phone: data.phone,
      code_hash: hashLoginCode(data.phone, code),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) return { ok: false as const, error: "Could not start sign-in. Please try again." };

    const sent = await sendSms(data.phone, `Your Skillora sign-in code is ${code}. It expires in 10 minutes.`);
    if (!sent.ok) return { ok: false as const, error: sent.error };

    return { ok: true as const };
  });

export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; fullName?: string }) => ({
    phone: phoneSchema.parse(input.phone),
    code: codeSchema.parse(input.code),
    fullName: input.fullName ? nameSchema.parse(input.fullName) : undefined,
  }))
  .handler(async ({ data }) => {
    const { hashLoginCode, phoneToEmail } = await import("./phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("phone_login_codes")
      .select("id, code_hash, expires_at, attempts, consumed_at")
      .eq("phone", data.phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "No pending code for this number. Request a new one." };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "That code expired. Request a new one." };
    }
    if (row.attempts >= 5) return { ok: false as const, error: "Too many attempts. Request a new code." };

    if (row.code_hash !== hashLoginCode(data.phone, data.code)) {
      await supabaseAdmin
        .from("phone_login_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return { ok: false as const, error: "Incorrect code." };
    }

    // Find an existing account for this number
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();

    const email = phoneToEmail(data.phone);

    if (!existing && !data.fullName) {
      // Code is correct but we need a name before creating the account.
      return { ok: false as const, needsName: true as const, error: "Tell us your name to finish signing up." };
    }

    let userId = existing?.id ?? null;
    let loginEmail = email;

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, phone: data.phone },
      });
      if (createErr || !created.user) {
        return { ok: false as const, error: "Could not create your account. Please try again." };
      }
      userId = created.user.id;
    } else {
      const { data: found } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (found?.user?.email) loginEmail = found.user.email;
    }

    const nowIso = new Date().toISOString();
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      phone: data.phone,
      phone_verified: true,
      phone_verified_at: nowIso,
      ...(data.fullName ? { full_name: data.fullName } : {}),
    });

    await supabaseAdmin.from("phone_login_codes").update({ consumed_at: nowIso }).eq("id", row.id);

    // Mint a one-time token the browser can exchange for a session.
    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: loginEmail,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
      return { ok: false as const, error: "Could not complete sign-in. Please try again." };
    }

    return { ok: true as const, tokenHash, isNewUser: !existing };
  });