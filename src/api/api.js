// src/api/api.js
export const API_BASE = "http://localhost:8080";

async function parseSafe(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

export async function apiGet(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  const data = await parseSafe(res);
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost(endpoint, body) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await parseSafe(res);
  return { ok: res.ok, status: res.status, data };
}
