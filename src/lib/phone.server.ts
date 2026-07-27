import { createHash, randomInt } from "crypto";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(userId: string, phone: string, code: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${userId}:${phone}:${code}:${pepper}`).digest("hex");
}

export function hashLoginCode(phone: string, code: string): string {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`login:${phone}:${code}:${pepper}`).digest("hex");
}

export function phoneToEmail(phone: string): string {
  return `${phone.replace(/\D/g, "")}@phone.skillora.app`;
}

export async function sendSms(
  to: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!lovableKey || !twilioKey || !from) {
    return { ok: false, error: "SMS sending isn't configured yet. Please contact support." };
  }

  const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Twilio send failed [${response.status}]: ${text}`);
    return { ok: false, error: "Could not send the SMS. Please check the number and try again." };
  }

  return { ok: true };
}