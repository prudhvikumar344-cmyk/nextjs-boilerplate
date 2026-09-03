import { useState } from "react";
import Head from "next/head";
import jsPDF from "jspdf";
// Imported (not referenced via a "/..." public URL) so it works regardless
// of the static assets folder's exact casing on disk.
import logoImg from "../Public/tripplanbuddy-logo.png";

// Helper to clean up itinerary text (remove extra blank lines, trim, etc.)
function formatItineraryText(raw) {
  if (!raw) return "";
  let t = raw.replace(/\r\n/g, "\n").trim();
  // Collapse 3+ newlines into a single blank line
  t = t.replace(/\n{3,}/g, "\n\n");
  return t;
}

// Derive a low/medium/high budget label from the slider value
// (previously this was a separate piece of state that never actually
// updated when the user moved the slider)
function budgetLabelFor(level) {
  if (level < 2000) return "low";
  if (level < 8000) return "medium";
  return "high";
}

// --- Small inline icons (no external icon library / network dependency) ---
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const [destination, setDestination] = useState("");
  const [tripDate, setTripDate] = useState(""); // single date
  const [travelers, setTravelers] = useState("2");

  const [budgetLevel, setBudgetLevel] = useState(1000);

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

  // Toggle a single interest on/off
  const toggleInterest = (value) => {
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((i) => i !== value)
        : [...prev, value]
    );
  };

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
          budget: budgetLabelFor(budgetLevel),
          budgetValue: budgetLevel,
          pace,
          durationDays,
          interests,
          transportation,
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

  return (
    <main className="page-root">
      <Head>
        <title>TripPlanBuddy — Free AI Travel Itinerary Planner</title>
        <meta
          name="description"
          content="Plan your next trip in seconds, for free. Tell TripPlanBuddy your destination, dates, budget, and interests, and get a personalized day-by-day travel itinerary you can download as a PDF."
        />
        <meta
          name="keywords"
          content="travel itinerary, trip planner, free travel planner, AI trip planner, vacation planner, travel itinerary generator"
        />
        <link rel="canonical" href="https://tripplanbuddy.com/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="TripPlanBuddy — Free AI Travel Itinerary Planner" />
        <meta
          property="og:description"
          content="Plan your next trip in seconds, for free. Get a personalized day-by-day travel itinerary you can download as a PDF."
        />
        <meta property="og:url" content="https://tripplanbuddy.com/" />
        <meta property="og:site_name" content="TripPlanBuddy" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="TripPlanBuddy — Free AI Travel Itinerary Planner" />
        <meta
          name="twitter:description"
          content="Plan your next trip in seconds, for free. Get a personalized day-by-day travel itinerary you can download as a PDF."
        />

        {/* Favicon: inline SVG data URI so it doesn't depend on any static file */}
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%B3%3C/text%3E%3C/svg%3E"
        />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4F46E5" />

        {/* Inter font, loaded from Google Fonts (no build-time dependency) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* ---------------------------------------------------------------- */}
      {/* Header / nav                                                     */}
      {/* ---------------------------------------------------------------- */}
      <header className="site-header">
        <div className="site-header__inner">
          <div className="brand">
            <img
              src={logoImg.src || logoImg}
              alt="TripPlanBuddy logo"
              className="brand__logo"
            />
            <span className="brand__name">TripPlanBuddy</span>
          </div>
          <nav className="site-nav">
            <a href="#how-it-works" className="site-nav__link">
              How it works
            </a>
            <a href="#planner" className="site-nav__cta">
              Plan my trip
            </a>
          </nav>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="hero">
        <div className="hero__inner">
          <span className="eyebrow">100% Free · No sign-up required</span>
          <h1 className="hero__title">Plan your perfect trip in seconds</h1>
          <p className="hero__subtitle">
            Tell us where you&rsquo;re going, your budget, and what you love —
            our AI builds a personalized, day-by-day itinerary you can
            download and take with you.
          </p>
          <a href="#planner" className="hero__cta">
            Start planning — it&rsquo;s free
          </a>
          <div className="hero__trust">
            <span>✓ No credit card</span>
            <span>✓ Personalized to you</span>
            <span>✓ Download as PDF</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="how">
        <div className="how__inner">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Three simple steps to your next trip.
          </p>

          <div className="how__grid">
            <div className="how__step">
              <div className="how__icon">
                <MapPinIcon />
              </div>
              <h3>Tell us about your trip</h3>
              <p>Destination, dates, budget, and what you&rsquo;re into.</p>
            </div>

            <div className="how__step">
              <div className="how__icon">
                <ZapIcon />
              </div>
              <h3>AI builds your itinerary</h3>
              <p>A personalized day-by-day plan, generated in seconds.</p>
            </div>

            <div className="how__step">
              <div className="how__icon">
                <DownloadIcon />
              </div>
              <h3>Download &amp; go</h3>
              <p>Save it as a PDF and take it with you on the trip.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Planner                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section id="planner" className="planner">
        <div className="planner__inner">
          <div className="planner__intro">
            <span className="eyebrow eyebrow--dark">Plan your trip</span>
            <h2 className="section-title">Build your itinerary</h2>
            <p className="section-subtitle">
              Fill in a few details and we&rsquo;ll do the rest.
            </p>
          </div>

          <div className="layout-grid">
            {/* LEFT COLUMN */}
            <div className="left-column">
              {/* Trip basics */}
              <section className="card">
                <h2 className="card-title">Trip basics</h2>

                <div className="card-body">
                  <div className="field">
                    <label className="label">Destination</label>
                    <input
                      placeholder="Tokyo, Paris, Bali..."
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="field">
                    <label className="label">
                      When are you planning to go?
                    </label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="input"
                    />
                  </div>

                  <div className="field">
                    <label className="label">Number of travelers</label>
                    <input
                      type="number"
                      min={1}
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      className="input"
                    />
                  </div>

                  {/* Mode of transportation */}
                  <div className="field">
                    <label className="label">Mode of transportation</label>
                    <select
                      value={transportation}
                      onChange={(e) => setTransportation(e.target.value)}
                      className="input"
                    >
                      <option value="air">By air (flight)</option>
                      <option value="road">By road (car / bus / train)</option>
                      <option value="water">By water / cruise</option>
                    </select>
                  </div>

                  {/* Interests as checkbox pills */}
                  <div className="field">
                    <label className="label">
                      Interests (optional – choose one or more)
                    </label>
                    <div className="interests-grid">
                      {interestOptions.map((item) => {
                        const active = interests.includes(item);
                        return (
                          <label
                            key={item}
                            className={`interest-pill ${
                              active ? "interest-pill--active" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleInterest(item)}
                            />
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Trip style & notes */}
              <section className="card">
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
                    <label className="label">
                      Tell TripPlanBuddy what you really want
                    </label>
                    <textarea
                      placeholder="It's our honeymoon, I want to surprise my wife with a romantic rooftop dinner, a sunset boat ride, and some relaxed days at the beach..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="input textarea"
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
              <section className="card card--result">
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
                      Planning your days, picking activities, and organizing
                      your trip…
                    </p>
                  )}

                  {result?.itinerary && (
                    <pre className="itinerary-text">{result.itinerary}</pre>
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
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="brand">
            <img
              src={logoImg.src || logoImg}
              alt="TripPlanBuddy logo"
              className="brand__logo brand__logo--small"
            />
            <span className="brand__name">TripPlanBuddy</span>
          </div>
          <p className="site-footer__tagline">
            Free AI-powered travel itineraries.
          </p>
          <p className="site-footer__copyright">
            © {new Date().getFullYear()} TripPlanBuddy. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Styles */}
      <style jsx>{`
        .page-root {
          min-height: 100vh;
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 420px);
          color: #0f172a;
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
            sans-serif;
        }

        /* Header */
        .site-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid #e2e8f0;
        }

        .site-header__inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand__logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }

        .brand__logo--small {
          width: 24px;
          height: 24px;
        }

        .brand__name {
          font-weight: 700;
          font-size: 18px;
          color: #0f172a;
        }

        .site-nav {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .site-nav__link {
          font-size: 14px;
          color: #334155;
          text-decoration: none;
          font-weight: 500;
        }

        .site-nav__link:hover {
          color: #4f46e5;
        }

        .site-nav__cta {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          background: #4f46e5;
          padding: 9px 16px;
          border-radius: 10px;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .site-nav__cta:hover {
          background: #4338ca;
        }

        /* Hero */
        .hero {
          padding: 64px 20px 56px;
          text-align: center;
        }

        .hero__inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          color: #4f46e5;
          background: #eef2ff;
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 20px;
        }

        .hero__title {
          font-size: 44px;
          line-height: 1.15;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 16px;
          letter-spacing: -0.02em;
        }

        .hero__subtitle {
          font-size: 17px;
          color: #475569;
          line-height: 1.6;
          margin: 0 0 28px;
          max-width: 560px;
        }

        .hero__cta {
          display: inline-block;
          background: #4f46e5;
          color: #ffffff;
          font-weight: 600;
          font-size: 15px;
          padding: 14px 28px;
          border-radius: 12px;
          text-decoration: none;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
          transition: background 0.15s ease;
        }

        .hero__cta:hover {
          background: #4338ca;
        }

        .hero__trust {
          margin-top: 24px;
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
          font-size: 13px;
          color: #64748b;
        }

        /* How it works */
        .how {
          padding: 56px 20px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .how__inner {
          max-width: 1120px;
          margin: 0 auto;
          text-align: center;
        }

        .section-title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .section-subtitle {
          font-size: 15px;
          color: #64748b;
          margin: 0 0 36px;
        }

        .how__grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
          text-align: left;
        }

        .how__icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
        }

        .how__icon svg {
          width: 22px;
          height: 22px;
        }

        .how__step h3 {
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 6px;
        }

        .how__step p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
          margin: 0;
        }

        /* Planner */
        .planner {
          padding: 56px 20px 72px;
        }

        .planner__inner {
          max-width: 1120px;
          margin: 0 auto;
        }

        .planner__intro {
          text-align: center;
          margin-bottom: 36px;
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

        .card {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04),
            0 12px 24px rgba(15, 23, 42, 0.04);
          box-sizing: border-box;
        }

        .card--result {
          min-height: 260px;
        }

        .card-title {
          margin: 0 0 16px;
          font-size: 16px;
          font-weight: 600;
          color: #0f172a;
        }

        .card-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          width: 100%;
        }

        .label {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          display: block;
          color: #334155;
        }

        .field-label {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 6px;
          color: #334155;
        }

        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 13px;
          color: #334155;
        }

        .muted {
          font-size: 12px;
          color: #64748b;
        }

        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #0f172a;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
        }

        .textarea {
          resize: vertical;
          min-height: 100px;
        }

        .pace-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .pace-chip {
          padding: 10px 6px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          color: #334155;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pace-chip:hover {
          border-color: #c7d2fe;
        }

        .pace-chip--active {
          border: 1px solid #4f46e5;
          background-color: #4f46e5;
          color: #ffffff;
        }

        .slider {
          width: 100%;
          accent-color: #4f46e5;
        }

        .hint {
          margin-top: 6px;
          font-size: 11px;
          color: #64748b;
        }

        .interests-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .interest-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          font-size: 12px;
          cursor: pointer;
          color: #334155;
          user-select: none;
          transition: all 0.15s ease;
        }

        .interest-pill input {
          display: none;
          accent-color: #4f46e5;
        }

        .interest-pill--active {
          border: 1px solid #4f46e5;
          background-color: #eef2ff;
          color: #4338ca;
          font-weight: 600;
        }

        .error-box {
          font-size: 13px;
          color: #b91c1c;
          background-color: #fef2f2;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #fca5a5;
        }

        .primary-btn {
          margin-top: 4px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #4f46e5;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          background-color: #4f46e5;
          color: #ffffff;
          transition: background 0.15s ease;
        }

        .primary-btn:hover:not(:disabled) {
          background-color: #4338ca;
          border-color: #4338ca;
        }

        .primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .primary-btn--small {
          width: auto;
          padding: 10px 18px;
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
          color: #334155;
          line-height: 1.6;
          max-height: 65vh;
          overflow-y: auto;
          padding-right: 4px;
        }

        .placeholder {
          color: #64748b;
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
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
        }

        /* Footer */
        .site-footer {
          padding: 40px 20px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .site-footer__inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .site-footer__tagline {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0;
        }

        .site-footer__copyright {
          font-size: 12px;
          color: #94a3b8;
          margin: 8px 0 0;
        }

        /* Tablet */
        @media (max-width: 1024px) {
          .layout-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .how__grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 24px;
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .site-nav__link {
            display: none;
          }

          .hero {
            padding: 48px 16px 40px;
          }

          .hero__title {
            font-size: 32px;
          }

          .hero__subtitle {
            font-size: 15px;
          }

          .section-title {
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
