export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      destination,
      startDate,
      endDate,
      travelers,
      budget,
      pace,
      interests,
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
Dates: ${startDate} to ${endDate}
Number of travelers: ${travelers}
Budget: ${budget}
Pace: ${pace}
Interests: ${Array.isArray(interests) ? interests.join(", ") : interests}

Return a friendly text with:
- Short trip overview
- Day 1, Day 2, ... sections
- Morning / Afternoon / Evening suggestions
- Some food/area suggestions
- Important tips (tickets, weather, local transit, etc.)
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
              "You create practical, realistic travel itineraries in clear, simple English.",
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
