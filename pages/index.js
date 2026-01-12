import { useState } from "react";

export default function Home() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState("medium");
  const [pace, setPace] = useState("normal");
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const interestOptions = [
    "Sightseeing",
    "Food & Cafes",
    "Nightlife",
    "Nature & Hiking",
    "Museums & Culture",
    "Shopping",
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

    if (!destination || !startDate || !endDate) {
      setError("Please enter destination and dates.");
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
          pace,
          interests,
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

  function downloadAsText() {
    if (!result?.itinerary) return;
    const blob = new Blob([result.itinerary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tripplanbuddy-itinerary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 16px",
        boxSizing: "border-box",
        backgroundColor: "#f5f5f5",
        color: "#111111",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100 }}>
        {/* Header */}
        <header
          style={{
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 700, color: "#000000" }}>
            TripPlanBuddy
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#444444",
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            Plan your trip in seconds. Enter your basic details and get a
            clear, day-by-day travel itinerary you can download and share.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
          }}
        >
          {/* Form */}
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 18,
              border: "1px solid #dddddd",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                marginBottom: 12,
                fontSize: 16,
                fontWeight: 600,
                color: "#111111",
              }}
            >
              Trip details
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              {/* Destination */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    display: "block",
                    marginBottom: 4,
                    color: "#222222",
                  }}
                >
                  Destination
                </label>
                <input
                  placeholder="Tokyo, Paris, Bali..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #000000",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* Dates */}
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      display: "block",
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #000000",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      display: "block",
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #000000",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Travelers / Budget / Pace */}
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      display: "block",
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
                    Travelers
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #000000",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      display: "block",
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
                    Budget
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #000000",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      display: "block",
                      marginBottom: 4,
                      color: "#222222",
                    }}
                  >
                    Pace
                  </label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #000000",
                      backgroundColor: "#ffffff",
                      color: "#000000",
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    <option value="relaxed">Relaxed</option>
                    <option value="normal">Normal</option>
                    <option value="packed">Packed</option>
                  </select>
                </div>
              </div>

              {/* Interests */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    display: "block",
                    marginBottom: 4,
                    color: "#222222",
                  }}
                >
                  Interests
                </label>
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

              {/* Error */}
              {error && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#b00020",
                    backgroundColor: "#ffe6e9",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #b00020",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "10px 12px",
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
                {loading ? "Planning your trip..." : "Generate itinerary"}
              </button>
            </form>
          </section>

          {/* Result */}
          <section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 18,
              border: "1px solid #dddddd",
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
                gap: 8,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#111111",
                }}
              >
                Your itinerary
              </h2>
              <button
                onClick={downloadAsText}
                disabled={!result?.itinerary}
                style={{
                  fontSize: 11,
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #000000",
                  backgroundColor: result?.itinerary ? "#ffffff" : "#f5f5f5",
                  color: "#000000",
                  cursor: result?.itinerary ? "pointer" : "default",
                  opacity: result?.itinerary ? 1 : 0.5,
                }}
              >
                Download as .txt
              </button>
            </div>

            {!result && !loading && (
              <p
                style={{
                  fontSize: 13,
                  color: "#555555",
                  lineHeight: 1.5,
                }}
              >
                After you generate your plan, your full day-by-day itinerary
                will appear here.
              </p>
            )}

            {loading && (
              <p style={{ fontSize: 13, color: "#555555" }}>
                Planning your days, checking activities, and organizing your
                trip…
              </p>
            )}

            {result?.itinerary && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#fafafa",
                  border: "1px solid #e5e5e5",
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                  maxHeight: "70vh",
                  overflowY: "auto",
                  color: "#111111",
                }}
              >
                {result.itinerary}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
