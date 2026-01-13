import { useState } from "react";
import jsPDF from "jspdf";

// Helper to clean up itinerary text (remove extra blank lines, trim, etc.)
function formatItineraryText(raw) {
  if (!raw) return "";
  let t = raw.replace(/\r\n/g, "\n").trim();
  // Collapse 3+ newlines into a single blank line
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

export default function Home() {
  const [destination, setDestination] = useState("");
  const [tripDate, setTripDate] = useState(""); // single date
  const [travelers, setTravelers] = useState("2");

  const [budgetLevel, setBudgetLevel] = useState(1000);
  const [budget, setBudget] = useState("medium");

  const [pace, setPace] = useState("normal");
  const [durationDays, setDurationDays] = useState(7);

  const [interests, setInterests] = useState([]); // optional
  const [transportation, setTransportation] = useState("air"); // NEW
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showResultCard, setShowResultCard] = useState(false);

  // Expanded interest options, including kids/teens/seniors/clubs/pubs
  const interestOptions = [
    "Sightseeing & Landmarks",
    "Food & Cafes",
    "Fine Dining",
    "Shopping & Malls",
    "Nature & Hiking",
    "Beaches & Relaxation",
    "Museums & Culture",
    "Family-friendly / Kids",
    "Theme Parks & Attractions",
    "Teen-friendly Hangouts",
    "Senior-friendly / Low Walking",
    "Spa & Wellness",
    "Adventure Sports",
    "Clubs & Nightlife",
    "Pubs & Bars",
    "Religious / Spiritual Sites",
  ];

  const paceOptions = [
    { value: "relaxed", label: "Relaxed" },
    { value: "normal", label: "Moderate" },
    { value: "active", label: "Active" },
    { value: "intense", label: "Intense" },
  ];

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");
    setResult(null);
    setShowResultCard(true);

    if (!destination || !tripDate) {
      setError("Please enter destination and trip date.");
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
          tripDate,
          travelers,
          budget,
          budgetValue: budgetLevel,
          pace,
          durationDays,
          interests,
          transportation, // NEW
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate itinerary.");
      }

      // Clean the itinerary text before storing
      const cleaned = formatItineraryText(data.itinerary);
      setResult({ itinerary: cleaned });
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
    const dateLine = tripDate
      ? `${tripDate} (around ${durationDays} days)`
      : `Around ${durationDays} days`;

    const doc = new jsPDF("p", "pt", "a4");
    const marginLeft = 40;
    const marginTop = 50;
    const maxWidth = 515;

    doc.setFontSize(16);
    doc.text(`TripPlanBuddy Itinerary`, marginLeft, marginTop);
    doc.setFontSize(12);
    doc.text(`Destination: ${titleDestination}`, marginLeft, marginTop + 20);
    doc.text(`Trip date & duration: ${dateLine}`, marginLeft, marginTop + 36);
    doc.text(
      `Travelers: ${travelers || "N/A"}  •  Pace: ${pace}  •  Transport: ${
        transportation === "air"
          ? "By air"
          : transportation === "road"
          ? "By road"
          : "By water / cruise"
      }`,
      marginLeft,
      marginTop + 52
    );

    // Already cleaned text
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
    padding: 20,
    border: "1px solid #e1e1e1",
    boxShadow: "0 8px 26px rgba(0,0,0,0.03)",
    boxSizing: "border-box",
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
    boxSizing: "border-box",
  };

  return (
    <main className="page-root">
      <div className="page-wrapper">
        {/* Header */}
        <header className="header">
          <div>
            <h1 className="title">TripPlanBuddy</h1>
            <p className="subtitle">
              Plan your trip in seconds. choose your pace and budget, tell
              TripPlanBuddy what you really want, and get a day-by-day itinerary
              you can download as a PDF.
            </p>
          </div>

          <span className="pill">Powered by AI itineraries</span>
        </header>

        {/* Main grid */}
        <div className="layout-grid">
          {/* LEFT COLUMN */}
          <div className="left-column">
            {/* Trip basics */}
            <section style={cardStyle}>
              <h2 className="card-title">Trip basics</h2>

              <div className="card-body">
                <div className="field">
                  <label style={labelStyle}>Destination</label>
                  <input
                    placeholder="Tokyo, Paris, Bali..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="field">
                  <label style={labelStyle}>When are you planning to go?</label>
                  <input
                    type="date"
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div className="field">
                  <label style={labelStyle}>Number of travelers</label>
                  <input
                    type="number"
                    min={1}
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* NEW: Mode of transportation */}
                <div className="field">
                  <label style={labelStyle}>Mode of transportation</label>
                  <select
                    value={transportation}
                    onChange={(e) => setTransportation(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="air">By air (flight)</option>
                    <option value="road">By road (car / bus / train)</option>
                    <option value="water">By water / cruise</option>
                  </select>
                </div>

                <div className="field">
                  <label style={labelStyle}>
                    Interests (optional – choose one or more)
                  </label>
                  <select
                    multiple
                    value={interests}
                    onChange={(e) => {
                      const selected = Array.from(
                        e.target.selectedOptions
                      ).map((o) => o.value);
                      setInterests(selected);
                    }}
                    style={{ ...inputStyle, height: 110 }}
                  >
                    {interestOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Trip style & notes */}
            <section style={cardStyle}>
              <h2 className="card-title">Trip style &amp; notes</h2>

              <div className="card-body">
                {/* Pace */}
                <div className="field">
                  <div className="field-label">Pace level</div>
                  <div className="pace-row">
                    {paceOptions.map((p) => {
                      const active = pace === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPace(p.value)}
                          className={`pace-chip ${
                            active ? "pace-chip--active" : ""
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Budget slider – up to 100k */}
                <div className="field">
                  <div className="field-label-row">
                    <span>Budget level (all inclusive)</span>
                    <span className="muted">
                      Approx: ${budgetLevel.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={100000}
                    step={500}
                    value={budgetLevel}
                    onChange={(e) => setBudgetLevel(Number(e.target.value))}
                    className="slider"
                  />
                  <div className="hint">
                    Drag to match your rough total budget (up to $100,000).
                  </div>
                </div>

                {/* Duration slider */}
                <div className="field">
                  <div className="field-label-row">
                    <span>Duration</span>
                    <span className="muted">
                      {durationDays} {durationDays === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={durationDays}
                    onChange={(e) =>
                      setDurationDays(Number(e.target.value))
                    }
                    className="slider"
                  />
                </div>

                {/* Notes */}
                <div className="field">
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
                      minHeight: 90,
                    }}
                  />
                </div>

                {error && <div className="error-box">{error}</div>}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="primary-btn"
                >
                  {loading
                    ? "Planning your itinerary..."
                    : "Generate itinerary"}
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN – Itinerary */}
          {showResultCard && (
            <section style={{ ...cardStyle, minHeight: 260 }}>
              <div className="itinerary-header">
                <h2 className="card-title">Your itinerary</h2>
              </div>

              <div className="itinerary-body">
                {!result && !loading && !error && (
                  <p className="placeholder">
                    Your itinerary will appear here after generation.
                  </p>
                )}

                {loading && (
                  <p className="placeholder">
                    Planning your days, picking activities, and organizing your
                    trip…
                  </p>
                )}

                {result?.itinerary && (
                  <pre className="itinerary-text">
                    {result.itinerary}
                  </pre>
                )}
              </div>

              {result?.itinerary && (
                <div className="itinerary-footer">
                  <button
                    onClick={downloadAsPdf}
                    className="primary-btn primary-btn--small"
                  >
                    Download itinerary (PDF)
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .page-root {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 32px 16px;
          box-sizing: border-box;
          background: radial-gradient(
            circle at top left,
            #e0f3ff,
            #f5fbff,
            #e0f3ff
          ); /* light sky-blue/whitish */
          color: #111111;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .page-wrapper {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }

        .header {
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          color: #000000;
          margin: 0 0 4px;
        }

        .subtitle {
          font-size: 14px;
          color: #444444;
          max-width: 650px;
          line-height: 1.5;
          margin: 0;
        }

        .pill {
          font-size: 11px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #000000;
          background-color: #ffffff;
          white-space: nowrap;
        }

        .layout-grid {
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.25fr);
          align-items: flex-start;
        }

        .left-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-title {
          margin: 0 0 10px;
          font-size: 15px;
          font-weight: 600;
          color: #111111;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field {
          width: 100%;
        }

        .field-label {
          font-size: 13px;
          margin-bottom: 6px;
          color: #222222;
        }

        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;
        }

        .muted {
          font-size: 12px;
          color: #444444;
        }

        .pace-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .pace-chip {
          padding: 10px 6px;
          border-radius: 12px;
          border: 1px solid #d6d6d6;
          background-color: #f8f8f8;
          color: #111111;
          font-size: 12px;
          cursor: pointer;
        }

        .pace-chip--active {
          border: 2px solid #000000;
          background-color: #000000;
          color: #ffffff;
        }

        .slider {
          width: 100%;
        }

        .hint {
          margin-top: 6px;
          font-size: 11px;
          color: #666666;
        }

        .error-box {
          font-size: 12px;
          color: #b00020;
          background-color: #ffe6e9;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid #b00020;
          margin-bottom: 4px;
        }

        .primary-btn {
          margin-top: 6px;
          width: 100%;
          padding: 11px 12px;
          border-radius: 999px;
          border: 1px solid #000000;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          background-color: #000000;
          color: #ffffff;
        }

        .primary-btn--small {
          width: auto;
          padding: 9px 16px;
          font-size: 13px;
        }

        .itinerary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .itinerary-body {
          font-size: 13px;
          color: #333333;
          line-height: 1.6;
          max-height: 65vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .placeholder {
          color: #666666;
          font-size: 13px;
          margin: 0;
        }

        .itinerary-text {
          white-space: pre-wrap;
          font-family: inherit;
          margin: 0;
        }

        .itinerary-footer {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid #e5e5e5;
          display: flex;
          justify-content: flex-end;
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .layout-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .title {
            font-size: 24px;
          }

          .layout-grid {
            gap: 20px;
          }

          .pace-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
