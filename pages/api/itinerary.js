export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY environment variable in Vercel.",
      });
    }

    const userPrompt = `
You are TripPlanBuddy, an expert travel planner.

Create a clear, realistic, day-by-day travel itinerary.

Destination: ${destination}
Trip date: ${tripDate || "not specified"}
Approx duration from slider: ${durationDays} days
Number of travelers: ${travelers}
Budget label: ${budget}
Approx total budget from slider: $${budgetValue}
Preferred pace: ${pace}
Preferred mode of transportation: ${
      transportation || "not specified"
    } (road / air / water)
Interests (optional): ${Array.isArray(interests) ? interests.join(", ") : "None"}

Special notes from the traveler (very important, incorporate into the plan):
${notes || "No extra notes provided."}

Formatting requirements:
- Use plain text (no markdown symbols like **, bullets with hyphens only if needed).
- Use concise paragraphs and Day 1 / Day 2 / ... headings.
- Avoid more than one blank line between paragraphs.
- Make it look clean and easy to read.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You create practical, realistic travel itineraries in clear, simple English with clean formatting.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        `OpenAI API error (status ${response.status}). Check your API key and billing.`;
      console.error("OpenAI API error:", message);
      return res.status(response.status).json({ error: message });
    }

    const itineraryText =
      data.choices?.[0]?.message?.content || "No itinerary generated.";

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
