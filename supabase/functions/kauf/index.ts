// Gymlimpix Kauf: prüft einen Google-Play-Kauf (Premium-Pass, 7,99 Euro) und schaltet Premium frei.
// Secrets: PLAY_SERVICE_ACCOUNT (JSON des Dienstkontos mit Zugriff auf die Play Console), PLAY_PACKAGE (Paketname der App).
// Das Produkt ist "verbrauchbar", damit es in jeder Saison neu gekauft werden kann. Jeder Kauf-Token zählt nur einmal.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const PRODUKTE = ["premium_pass"];

const b64url = (d: ArrayBuffer | string) => {
  const s = typeof d === "string" ? btoa(unescape(encodeURIComponent(d))) : btoa(String.fromCharCode(...new Uint8Array(d)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function googleToken(sa: { client_email: string; private_key: string; token_uri?: string }) {
  const jetzt = Math.floor(Date.now() / 1000);
  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
  const kopf = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const inhalt = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud, iat: jetzt, exp: jetzt + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${kopf}.${inhalt}`));
  const r = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${kopf}.${inhalt}.${b64url(sig)}` }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Google-Anmeldung fehlgeschlagen");
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ fehler: "Ungültige Anfrage" }, 400); }
  const produkt = PRODUKTE.includes(b?.produkt) ? b.produkt : null;
  const token = typeof b?.token === "string" && b.token.length < 1000 ? b.token : null;
  if (!produkt || !token || typeof b.p_id !== "string" || typeof b.p_geheim !== "string") return json({ fehler: "Ungültige Anfrage" }, 400);

  const saRoh = Deno.env.get("PLAY_SERVICE_ACCOUNT"), paket = Deno.env.get("PLAY_PACKAGE");
  if (!saRoh || !paket) return json({ fehler: "Käufe sind auf dem Server noch nicht eingerichtet." }, 503);

  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { error: authFehler } = await anon.rpc("wf_pruefen", { p_id: b.p_id, p_geheim: b.p_geheim });
  if (authFehler) return json({ fehler: "Nicht angemeldet" }, 401);

  try {
    const zugang = await googleToken(JSON.parse(saRoh));
    const basis = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(paket)}/purchases/products/${produkt}/tokens/${encodeURIComponent(token)}`;
    const r = await fetch(basis, { headers: { Authorization: `Bearer ${zugang}` } });
    const kauf = await r.json();
    if (!r.ok) { console.error("play", r.status, JSON.stringify(kauf).slice(0, 300)); return json({ fehler: "Google kennt diesen Kauf nicht." }, 400); }
    if (kauf.purchaseState !== 0) return json({ fehler: kauf.purchaseState === 2 ? "Der Kauf ist noch nicht abgeschlossen." : "Der Kauf wurde abgebrochen." }, 400);

    const dienst = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await dienst.rpc("wf_pass_premium_geben", {
      p_spieler: b.p_id, p_token: token, p_produkt: produkt,
      p_daten: { orderId: kauf.orderId ?? null, zeit: kauf.purchaseTimeMillis ?? null, test: kauf.purchaseType === 0 },
    });
    if (error) { console.error("geben", error.message); return json({ fehler: error.message }, 400); }

    // verbrauchen, damit der Pass in der nächsten Saison wieder kaufbar ist
    if (kauf.consumptionState === 0) {
      const c = await fetch(`${basis}:consume`, { method: "POST", headers: { Authorization: `Bearer ${zugang}` } });
      if (!c.ok) console.error("consume", c.status, (await c.text()).slice(0, 200));
    }
    return json({ ok: true, schon: !!data?.schon });
  } catch (e) {
    console.error("kauf", (e as Error).message);
    return json({ fehler: "Der Kauf konnte gerade nicht geprüft werden. Er geht nicht verloren, versuch es gleich nochmal." }, 502);
  }
});
