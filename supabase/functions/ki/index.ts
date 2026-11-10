// Gymlimpix KI: Coach, Wochenplan und Essensscanner über den Server.
// Der Gemini-Schlüssel liegt nur hier (Secret GEMINI_API_KEY), nie in der App.
// Jede Anfrage prüft Spieler, Premium und Tageslimit (wf_ki_erlaubt).
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const JUGEND = "Die Nutzer sind oft Jugendliche. Empfiehl keine Crash-Diäten, kein Hungern und keine Kalorienziele unter dem Bedarf. Wirkt jemand, als hätte er Probleme mit dem Essen oder seinem Körperbild, weise freundlich auf Hilfe hin (Eltern, Hausarzt, BZgA-Beratung unter 0221 892031).";

const SYSTEM: Record<string, string> = {
  coach: "Du bist der Gymlimpix Coach, ein direkter, motivierender Fitness-Coach. Antworte auf Deutsch, kurz (maximal 120 Wörter), konkret und ohne Markdown-Sternchen. Keine Diagnosen, bei Beschwerden zum Arzt raten. Bleib bei Fitness, Training, Ernährung, Schlaf und Motivation. " + JUGEND,
  plan: "Du erstellst Trainingspläne für die Fitness-App Gymlimpix. Halte dich exakt an das verlangte JSON-Format. Pläne sind sicher, altersgerecht und steigern sich langsam. " + JUGEND,
  scan: "Du bist Ernährungsexperte. Analysiere das Foto der Mahlzeit und schätze die GESAMTE sichtbare Portion. Antworte NUR mit JSON ohne Text drumherum: {\"name\":\"kurzer deutscher Name\",\"portion\":\"geschätzte Menge, z. B. ca. 350 g\",\"kcal\":Zahl,\"protein\":Zahl in g,\"carbs\":Zahl in g,\"fat\":Zahl in g}. Ist kein Essen zu sehen: {\"name\":\"kein Essen erkannt\",\"portion\":\"\",\"kcal\":0,\"protein\":0,\"carbs\":0,\"fat\":0}.",
};

const MODELLE = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function gemini(art: string, parts: unknown[], history: unknown[]) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("KI ist auf dem Server noch nicht eingerichtet.");
  const body = JSON.stringify({
    contents: [...history, { role: "user", parts }],
    systemInstruction: { parts: [{ text: SYSTEM[art] }] },
    generationConfig: {
      temperature: art === "scan" ? 0.2 : 0.7,
      maxOutputTokens: art === "plan" ? 2500 : 700,
      thinkingConfig: { thinkingBudget: 0 },
      ...(art !== "coach" ? { responseMimeType: "application/json" } : {}),
    },
    safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
      .map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
  });
  let fehler = "KI antwortet gerade nicht.";
  for (const m of MODELLE) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body,
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const t = (j.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
        if (t) return t;
        fehler = "Leere Antwort";
        continue;
      }
      console.error("gemini", m, r.status, JSON.stringify(j).slice(0, 300));
      if (r.status === 429) fehler = "Die KI ist gerade ausgelastet. Versuch es gleich nochmal.";
    } catch (e) {
      fehler = (e as Error).name === "AbortError" ? "Zeitüberschreitung" : "Verbindung zur KI fehlgeschlagen";
    } finally { clearTimeout(to); }
  }
  throw new Error(fehler);
}

// Verlauf vom Coach säubern: nur Text, höchstens 8 Einträge
function verlauf(h: unknown): unknown[] {
  if (!Array.isArray(h)) return [];
  return h.slice(-8).flatMap((x: any) => {
    const role = x?.role === "model" ? "model" : "user";
    const text = String(x?.parts?.[0]?.text ?? "").slice(0, 2000);
    return text ? [{ role, parts: [{ text }] }] : [];
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ fehler: "Nur POST" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ fehler: "Ungültige Anfrage" }, 400); }

  const art = ["coach", "plan", "scan"].includes(b?.art) ? b.art : null;
  if (!art || typeof b.p_id !== "string" || typeof b.p_geheim !== "string") return json({ fehler: "Ungültige Anfrage" }, 400);
  const text = String(b.text ?? "").slice(0, 6000);
  const bild = typeof b.bild === "string" ? b.bild : "";
  if (art === "scan" && (!bild || bild.length > 2_000_000 || !/^[A-Za-z0-9+/=]+$/.test(bild))) return json({ fehler: "Bild fehlt oder ist zu groß" }, 400);
  if (art !== "scan" && !text.trim()) return json({ fehler: "Nachricht fehlt" }, 400);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: ok, error } = await db.rpc("wf_ki_erlaubt", { p_id: b.p_id, p_geheim: b.p_geheim, p_art: art });
  if (error) return json({ fehler: "Nicht angemeldet" }, 401);
  if (!ok?.ok) {
    if (ok?.grund === "premium") return json({ fehler: "Das gehört zu Premium.", grund: "premium" }, 402);
    return json({ fehler: art === "scan" ? `Du hast heute schon ${ok?.limit} Mal gescannt. Morgen geht es weiter.` : `Du hast heute schon ${ok?.limit} Fragen gestellt. Morgen geht es weiter.`, grund: "limit" }, 429);
  }

  try {
    const parts = art === "scan"
      ? [{ text: "Schätze diese Mahlzeit." }, { inline_data: { mime_type: "image/jpeg", data: bild } }]
      : [{ text }];
    const antwort = await gemini(art, parts, art === "coach" ? verlauf(b.history) : []);
    return json({ text: antwort, rest: ok.rest });
  } catch (e) {
    return json({ fehler: (e as Error).message }, 502);
  }
});
