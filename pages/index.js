import { useState } from "react";
import jsPDF from "jspdf";

export default function Home() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState("2");

  const [budgetLevel, setBudgetLevel] = useState(1000); // slider value
  const [budget, setBudget] = useState("medium"); // label we send to API

  const [pace, setPace] = useState("normal");
  const [durationDays, setDurationDays] = useState(7);

  const [interests, setInterests] = useState([]);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showResultCard, setShowResultCard] = useState(false);

  const interestOptions = [
    "Sightseeing",
    "Food & Cafes",
    "Nightlife",
    "Nature & Hiking",
    "Museums & Culture",
    "Shopping",
  ];

  const paceOptions = [
    { value: "relaxed", label: "Relaxed" },
    { value: "normal", label: "Moderate" },
    { value: "active", label: "Active" },
    { value: "intense", label: "Intense" },
  ];

  const toggleInterest = (item) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setShowResultCard(true); // make the itinerary card pop up immediately

    if (!destination || !startDate || !endDate) {
      setError("Please enter destination and dates.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          travelers,
          budget,
          budgetValue: budgetLevel,
          pace,
          durationDays,
          interests,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate itinerary.");
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function downloadAsPdf() {
    if (!result?.itinerary) return;

    const titleDestination = destination || "Your Trip";
    const dateRange =
      startDate && endDate ? `${startDate} → ${endDate}` : "Dates not set";

    const doc = new jsPDF("p", "pt", "a4");
    const marginLeft = 40;
    const marginTop = 50;
    const maxWidth = 515; // A4 width - margins

    doc.setFontSize(16);
    doc.text(`TripPlanBuddy Itinerary`, marginLeft, marginTop);
    doc.setFontSize(12);
    doc.text(`Destination: ${titleDestination}`, marginLeft, marginTop + 20);
    doc.text(`Dates: ${dateRange}`, marginLeft, marginTop + 36);
    doc.text(
      `Travelers: ${travelers || "N/A"}  •  Pace: ${pace}  •  Duration: ${durationDays} days`,
      marginLeft,
      marginTop + 52
    );

    const bodyText = result.itinerary;
    const lines = doc.splitTextToSize(bodyText, maxWidth);

    let currentY = marginTop + 80;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();

    lines.forEach((line) => {
      if (currentY + lineHeight > pageHeight - 40) {
        doc.addPage();
        currentY = 50;
      }
      doc.text(line, marginLeft, currentY);
      currentY += lineHeight;
    });

    doc.save("tripplanbuddy-itinerary.pdf");
  }

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e1e1e1",
    boxShadow: "0 8px 26px rgba(0,0,0,0.03)",
  };

  const labelStyle = {
    fontSize: 13,
    marginBottom: 4,
    display: "block",
    color: "#222222",
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #000000",
    backgroundColor: "#ffffff",
    color: "#000000",
    fontSize: 13,
    outline: "none",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 16px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at top left, #f5f5f5, #e9e9e9, #f5f5f5)",
        color: "#111111",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1120 }}>
        {/* Header */}
        <header
          style={{
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#000000",
                marginBottom: 4,
              }}
            >
              TripPlanBuddy
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#444444",
                maxWidth: 650,
                lineHeight: 1.5,
              }}
            >
              Plan your trip in seconds. Set your basics, choose your pace and
              budget, tell TripPlanBuddy what you really want, and get a
              day-by-day itinerary you can download as a PDF.
            </p>
          </div>

          <span
            style={{
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid #000000",
              backgroundColor: "#ffffff",
            }}
          >
            Powered by AI itineraries
          </span>
        </header>

        {/* Main grid */}
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.3fr)",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Trip basics card */}
            <section style={cardStyle}>
              <h2
                style={{
                  marginBottom: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#111111",
                }}
              >
                Trip basics
              </h2>

              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <label style={labelStyle}>Destination</label>
                  <input
                    placeholder="Tokyo, Paris, Bali..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  <div>
                    <label style={labelStyle}>Start date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>End date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Number of travelers</label>
                  <input
                    type="number"
                    min={1}
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Interests</label>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {interestOptions.map((item) => {
                      const active = interests.includes(item);
                      return (
                        <button
                          type="button"
                          key={item}
                          onClick={() => toggleInterest(item)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid #000000",
                            fontSize: 11,
                            cursor: "pointer",
                            backgroundColor: active ? "#000000" : "#ffffff",
                            color: active ? "#ffffff" : "#000000",
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* We keep the submit button in the second card (Trip style),
                    so here we just close the form – but we need the form
                    wrapper for enter-key, so Trip style section will use
                    the same handleSubmit. */}
              </form>
            </section>

            {/* Trip style card (pace, budget slider, duration slider, notes, button) */}
            <section style={cardStyle}>
              <h2
                style={{
                  marginBottom: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#111111",
                }}
              >
                Trip style & notes
              </h2>

              {/* Pace level */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    marginBottom: 8,
                    color: "#222222",
                  }}
                >
                  Pace level
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {paceOptions.map((p) => {
                    const active = pace === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPace(p.value)}
                        style={{
                          padding: "10px 6px",
                          borderRadius: 12,
                          border: active
                            ? "2px solid #000000"
                            : "1px solid #d6d6d6",
                          backgroundColor: active ? "#000000" : "#f8f8f8",
                          color: active ? "#ffffff" : "#111111",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget slider */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span>Budget level (all inclusive)</span>
                  <span style={{ fontSize: 12, color: "#444444" }}>
                    Approx: ${budgetLevel.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={20000}
                  step={500}
                  value={budgetLevel}
                  onChange={(e) => setBudgetLevel(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ marginTop: 6, fontSize: 11, color: "#666666" }}>
                  Drag to match your rough total budget.
                </div>
              </div>

              {/* Duration slider */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    fontSize: 13,
                  }}
                >
                  <span>Duration</span>
                  <span style={{ fontSize: 12, color: "#444444" }}>
                    {durationDays} {durationDays === 1 ? "day" : "days"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>
                  Tell TripPlanBuddy what you really want
                </label>
                <textarea
                  placeholder="It's our honeymoon, I want to surprise my wife with a romantic rooftop dinner, a sunset boat ride, and some relaxed days at the beach..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 80,
                  }}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#b00020",
                    backgroundColor: "#ffe6e9",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #b00020",
                    marginBottom: 8,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: 999,
                  border: "1px solid #000000",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  backgroundColor: "#000000",
                  color: "#ffffff",
                }}
              >
                {loading ? "Planning your itinerary..." : "Generate itinerary"}
              </button>
            </section>
          </div>

          {/* RIGHT COLUMN – Itinerary card */}
          {showResultCard && (
            <section style={{ ...cardStyle, minHeight: 260 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#111111",
                  }}
                >
                  Your itinerary
                </h2>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#333333",
                  lineHeight: 1.6,
                  maxHeight: "65vh",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {!result && !loading && !error && (
                  <p style={{ color: "#666666", fontSize: 13 }}>
                    Your itinerary will appear here after generation.
                  </p>
                )}

                {loading && (
                  <p style={{ color: "#666666", fontSize: 13 }}>
                    Planning your days, picking activities, and organizing your
                    trip…
                  </p>
                )}

                {result?.itinerary && (
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "inherit",
                      margin: 0,
                    }}
                  >
                    {result.itinerary}
                  </pre>
                )}
              </div>

              {/* Bottom bar with ONLY PDF download */}
              {result?.itinerary && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px solid #e5e5e5",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={downloadAsPdf}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 999,
                      border: "1px solid #000000",
                      backgroundColor: "#000000",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Download itinerary (PDF)
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
