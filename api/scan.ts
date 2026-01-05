import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const LOGIN = process.env.DATAFORSEO_LOGIN || "";
const PASSWORD = process.env.DATAFORSEO_PASSWORD || "";
const CACHE_TTL = Number(process.env.CACHE_TTL_SECONDS || "900");

const memoryCache = new Map<string, { exp: number; val: any }>();

function auth() {
  return "Basic " + Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64");
}

function key(obj: any) {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  if (!LOGIN || !PASSWORD) {
    return res.status(500).json({ error: "Missing DataForSEO credentials" });
  }

  const { query, location } = req.body || {};
  if (!query || !location) {
    return res.status(400).json({ error: "query + location required" });
  }

  const cacheKey = key({ query, location });
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return res.json({ ...cached.val, cached: true });
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), 12000);

  const dfs = await fetch(
    "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
    {
      method: "POST",
      headers: {
        Authorization: auth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword: `${query} ${location}`,
          language_name: "English",
          location_name: location,
          depth: 10
        }
      ]),
      signal: controller.signal
    }
  );

  if (!dfs.ok) {
    return res.status(502).json({ error: "DataForSEO failed" });
  }

  const json = await dfs.json();
  const items =
    json?.tasks?.[0]?.result?.[0]?.items?.filter((i: any) => i.type === "organic") || [];

  const result = {
    snapshot: {
      location,
      competitorsScanned: items.length,
      opportunityScore: 90,
      topMarketGap: "Missed leads due to weak visibility and slow response"
    },
    competitors: items.map((i: any) => ({
      name: i.title,
      domain: i.domain,
      visibility: i.rank_group <= 3 ? "High" : "Low"
    })),
    pain_points: [
      "After-hours leads are missed",
      "Top search results capture most demand"
    ],
    fix_plan: {
      quickWins: ["Missed-call capture", "GBP optimization"],
      momentum30: ["Local landing pages", "Review velocity"]
    }
  };

  memoryCache.set(cacheKey, {
    val: result,
    exp: Date.now() + CACHE_TTL * 1000
  });

  res.json(result);
}
