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
      origin,
      destination,
      tripDate,
      travelers,
      budget,
      budgetValue,
      currency,
      pace,
      durationDays,
      interests,
      tripType,
      transportation,
      wantsTransportSuggestions,
      budgetIncludesRoundTrip,
      notes,
    } = req.body || {};

    if (!destination || typeof destination !== "string") {
      return res.status(400).json({ error: "Please provide a destination." });
    }

    // Defense in depth: the UI already caps these, but a direct API
    // call could send anything, so clamp/limit server-side too. The UI's
    // slider goes up to 60 days, with a custom-entry fallback for longer
    // trips (long backpacking/relocation-style trips), so allow well
    // beyond that here too; 365 is just a sanity ceiling.
    const safeDurationDays = Math.min(
      Math.max(Number(durationDays) || 1, 1),
      365
    );
    // Long trips get a week-by-week structure instead of a full day-by-day
    // breakdown, both so the plan stays readable and so it reliably fits
    // inside max_tokens.
    const isLongTrip = safeDurationDays > 30;
    const safeNotes =
      typeof notes === "string" ? notes.slice(0, 2000) : "";
    const safeOrigin =
      typeof origin === "string" ? origin.slice(0, 200) : "";
    const safeCurrency =
      typeof currency === "string" && currency.trim()
        ? currency.trim().toUpperCase().slice(0, 6)
        : "USD";

    // Build the transportation guidance for the prompt from the two
    // related Yes/No answers collected in the UI.
    let transportGuidance;
    if (wantsTransportSuggestions === true) {
      transportGuidance = `The traveler wants transportation options suggested. Include a short "Getting there" section with 2-3 realistic ${
        transportation === "air"
          ? "flight routes/airlines"
          : transportation === "water"
          ? "ferry/cruise options"
          : "road/rail/bus options"
      } from ${
        safeOrigin || "their departure city"
      } to ${destination}, with an approximate cost range in ${safeCurrency}. Clearly label these as illustrative estimates, not live bookable prices, since you do not have access to real-time fares.`;
    } else if (wantsTransportSuggestions === false) {
      transportGuidance =
        budgetIncludesRoundTrip === true
          ? `The traveler is arranging their own transportation and confirmed the budget below ALREADY includes round-trip travel to/from ${destination}. Allocate the budget across transportation, lodging, food, and activities accordingly — do not assume the full amount is available for on-the-ground spending alone.`
          : `The traveler is arranging their own transportation and confirmed the budget below does NOT include round-trip travel to/from ${destination}. Treat the budget as covering only on-the-ground expenses (lodging, food, local transport, activities), and add a brief reminder that round-trip transportation should be budgeted separately.`;
    } else {
      transportGuidance =
        "The traveler didn't specify whether they want transportation suggestions or whether the budget includes round-trip travel — assume the budget is for on-the-ground expenses and mention transportation only briefly.";
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing ANTHROPIC_API_KEY environment variable in Vercel.",
      });
    }

    const userPrompt = `
You are TripPlanBuddy, an expert travel planner.

Create a clear, realistic, day-by-day travel itinerary.

Traveling from: ${safeOrigin || "not specified"}
Destination: ${destination}
Trip date: ${tripDate || "not specified"}
Approx duration from slider: ${safeDurationDays} days
Number of travelers: ${travelers}
Budget label: ${budget}
Approx total budget from slider: ${safeCurrency} ${budgetValue}
Preferred pace: ${pace}
Preferred mode of transportation: ${
      transportation || "not specified"
    } (road / air / water)
Who this trip is for: ${
      Array.isArray(tripType) && tripType.length ? tripType.join(", ") : "not specified"
    }
Interests (optional): ${Array.isArray(interests) ? interests.join(", ") : "None"}

Transportation guidance: ${transportGuidance}

Special notes from the traveler (very important, incorporate into the plan):
${safeNotes || "No extra notes provided."}

Formatting requirements:
- Use plain text (no markdown symbols like **, bullets with hyphens only if needed).
${
  isLongTrip
    ? `- This is a long trip (${safeDurationDays} days), so do NOT write one heading per day — that would be too long to be useful. Instead, structure it as "Week 1", "Week 2", etc., each with a short paragraph covering the theme/region for that week, 3-5 concrete highlights (specific places, activities, or day trips), and a rough cost range. Call out any single days worth planning in detail (e.g. an arrival day, a special excursion).`
    : `- Use concise paragraphs and Day 1 / Day 2 / ... headings.`
}
- Avoid more than one blank line between paragraphs.
- All money amounts should be in ${safeCurrency}, clearly labeled — do not silently convert to a different currency.
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
        // Long (30+ day) trips need more room even with the week-grouped
        // format above, so give those requests a bigger budget. Shorter
        // trips keep the original, cheaper limit.
        max_tokens: isLongTrip ? 8192 : 4096,
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

    // Claude's response can include multiple content blocks (e.g. a
    // "thinking" block before the actual reply), so find the first
    // text block instead of assuming it's always at index 0.
    const textBlock = Array.isArray(data?.content)
      ? data.content.find((block) => block?.type === "text" && block?.text)
      : null;
    const itineraryText = textBlock?.text || "No itinerary generated.";

    if (!textBlock) {
      // Diagnostic only — helps us see in Vercel logs exactly what shape
      // Claude returned if this ever happens again (e.g. hit max_tokens
      // mid-thinking, or a response format we don't handle yet).
      console.error(
        "No text block in Claude response. stop_reason:",
        data?.stop_reason,
        "content block types:",
        Array.isArray(data?.content)
          ? data.content.map((b) => b?.type)
          : typeof data?.content
      );
    }

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
