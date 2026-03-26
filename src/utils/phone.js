// src/utils/phone.js
export function formatPhoneForInput(raw = "") {
  const digitsRaw = (raw || "").replace(/\D/g, "");
  let digits = digitsRaw;
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.startsWith("7")) {
    if (digits.length === 1) return "+7 ";
    digits = digits.substring(1);
  }
  if (digits.length > 10) digits = digits.substring(0, 10);
  const a = digits.substring(0, 3);
  const b = digits.substring(3, 6);
  const c = digits.substring(6, 8);
  const e = digits.substring(8, 10);
  let out = "+7";
  if (a) out += " (" + a;
  if (a && a.length === 3) out += ")";
  if (b) out += " " + b;
  if (c) out += "-" + c;
  if (e) out += "-" + e;
  return out;
}

export function normalizePhoneForSend(raw = "") {
  const digitsRaw = (raw || "").replace(/\D/g, "");
  let digits = digitsRaw;
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10) return "7" + digits;
  if (digits.length === 11) return digits;
  return digits;
}
