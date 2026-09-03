// --- Very lightweight abuse protection -------------------------------
// This is a free, public, unauthenticated endpoint that calls the paid
// Claude API, so without *some* guard a bot (or an impatient double-click)
// can run up an unbounded bill. This in-memory limiter isn't perfect —
// serverless functions can spin up multiple instances, so a determined
// attacker could still get around it — but it stops the common cases
// (accidental request spam, simple bots) at zero cost and zero extra
// infrastructure. For stronger protection, add a rate-limiting rule in
// the Cloudflare dashboard for tripplanbuddy.com (Security > WAF).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 6;
const requestLog = new Map(); // ip -> array of timestamps

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestLog.set(ip, timestamps);

  // Keep the map from growing forever on a long-running instance
  if (requestLog.size > 5000) {
    requestLog.clear();
  }

  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error:
        "Too many itinerary requests from this device. Please wait a few minutes and try again.",
    });
  }

  try {
    const {
      destination,
      tripDate,
      travelers,
      budget,
      budgetValue,
      pace,
      durationDays,
      interests,
      transportation,
      notes,
    } = req.body || {};

    if (!destination || typeof destination !== "string") {
      return res.status(400).json({ error: "Please provide a destination." });
    }

    // Defense in depth: the UI already caps these, but a direct API
    // call could send anything, so clamp/limit server-side too.
    const safeDurationDays = Math.min(
      Math.max(Number(durationDays) || 1, 1),
      30
    );
    const safeNotes =
      typeof notes === "string" ? notes.slice(0, 2000) : "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing ANTHROPIC_API_KEY environment variable in Vercel.",
      });
    }

    const userPrompt = `
You are TripPlanBuddy, an expert travel planner.

Create a clear, realistic, day-by-day travel itinerary.

Destination: ${destination}
Trip date: ${tripDate || "not specified"}
Approx duration from slider: ${safeDurationDays} days
Number of travelers: ${travelers}
Budget label: ${budget}
Approx total budget from slider: $${budgetValue}
Preferred pace: ${pace}
Preferred mode of transportation: ${
      transportation || "not specified"
    } (road / air / water)
Interests (optional): ${Array.isArray(interests) ? interests.join(", ") : "None"}

Special notes from the traveler (very important, incorporate into the plan):
${safeNotes || "No extra notes provided."}

Formatting requirements:
- Use plain text (no markdown symbols like **, bullets with hyphens only if needed).
- Use concise paragraphs and Day 1 / Day 2 / ... headings.
- Avoid more than one blank line between paragraphs.
- Make it look clean and easy to read.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        // NOTE: `temperature` is intentionally omitted — Claude Sonnet 5
        // deprecated this parameter and rejects requests that include it
        // with a 400 error ("`temperature` is deprecated for this model").
        system:
          "You create practical, realistic travel itineraries in clear, simple English with clean formatting.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `Claude API error (status ${response.status}). Check your API key and billing.`;
      console.error("Claude API error:", message);
      return res.status(response.status).json({ error: message });
    }

    const itineraryText =
      data?.content?.[0]?.text || "No itinerary generated.";

    return res.status(200).json({ itinerary: itineraryText });
  } catch (err) {
    console.error("Itinerary API error:", err);
    return res.status(500).json({
      error:
        err?.message ||
        "Server error while generating itinerary. Check logs on Vercel.",
    });
  }
}
