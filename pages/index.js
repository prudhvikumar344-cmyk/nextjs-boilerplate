import { useState, useEffect } from "react";
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

// Rough per-currency slider ranges. These multipliers are NOT live exchange
// rates — they're static approximations so the slider's max feels right for
// a genuinely high-budget international trip, whatever currency the
// traveler is thinking in. (100,000 INR is only ~1,100 USD — nowhere near
// enough for an international trip — while 100,000 USD very much is, which
// was the mismatch a traveler ran into.)
const currencyBudgetConfig = {
  USD: { max: 100000, step: 500 },
  EUR: { max: 100000, step: 500 },
  GBP: { max: 90000, step: 500 },
  INR: { max: 10000000, step: 5000 }, // up to 1 crore
  JPY: { max: 15000000, step: 5000 },
  AUD: { max: 150000, step: 500 },
  CAD: { max: 140000, step: 500 },
  CNY: { max: 700000, step: 1000 },
  SGD: { max: 140000, step: 500 },
  AED: { max: 400000, step: 1000 },
  CHF: { max: 100000, step: 500 },
  MXN: { max: 1800000, step: 5000 },
  BRL: { max: 500000, step: 1000 },
  ZAR: { max: 1800000, step: 5000 },
};
function getBudgetConfig(currencyCode) {
  return currencyBudgetConfig[currencyCode] || currencyBudgetConfig.USD;
}

// India's own numbering system (lakh = 100,000, crore = 10,000,000) is what
// travelers budgeting in INR actually think in, so we show it alongside the
// raw number. Everything else gets the more universal K/M shorthand once
// the number gets large enough that the raw digits are hard to scan.
function formatBudgetAbbrev(value, currencyCode) {
  if (currencyCode === "INR") {
    if (value >= 10000000) {
      const cr = value / 10000000;
      return `${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
    }
    if (value >= 100000) {
      const l = value / 100000;
      return `${l % 1 === 0 ? l : l.toFixed(2)} L`;
    }
    return null;
  }
  if (value >= 1000000) {
    const m = value / 1000000;
    return `${m % 1 === 0 ? m : m.toFixed(2)}M`;
  }
  if (value >= 1000) {
    const k = value / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return null;
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
  const [origin, setOrigin] = useState(""); // NEW – where the trip starts from
  const [destination, setDestination] = useState("");
  const [tripDate, setTripDate] = useState(""); // single date
  const [travelers, setTravelers] = useState("2");

  const [budgetLevel, setBudgetLevel] = useState(1000);
  const [currency, setCurrency] = useState("USD"); // NEW – budget currency
  const [useUSD, setUseUSD] = useState(true); // NEW – "budget is in USD" checkbox

  const [pace, setPace] = useState("normal");
  const [durationDays, setDurationDays] = useState(7);
  // NEW – lets a traveler type an exact day count instead of being limited
  // to what the slider can represent (a trip could be 90, 120... days).
  const [useCustomDuration, setUseCustomDuration] = useState(false);

  const [interests, setInterests] = useState([]); // optional
  const [tripType, setTripType] = useState([]); // NEW – family, friends, kids, etc.
  const [transportation, setTransportation] = useState("air"); // NEW
  // NEW – null = not answered yet, true/false once the traveler picks
  const [wantsTransportSuggestions, setWantsTransportSuggestions] =
    useState(null);
  const [budgetIncludesRoundTrip, setBudgetIncludesRoundTrip] =
    useState(null);
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [showResultCard, setShowResultCard] = useState(false);
  // NEW – feedback line under the "Share to phone" button (e.g. "Copied!"
  // on desktop browsers that don't support the native share sheet)
  const [shareMessage, setShareMessage] = useState("");

  // Kept short on purpose so the form stays quick to fill in. Audience-based
  // interests (kids/teens/seniors, etc.) already live in the "Who's this
  // trip for?" tags above, so we don't repeat them here.
  const interestOptions = [
    "Sightseeing & Culture",
    "Food & Dining",
    "Shopping",
    "Nature & Outdoors",
    "Nightlife & Entertainment",
    "Relaxation & Wellness",
  ];

  const paceOptions = [
    { value: "relaxed", label: "Relaxed" },
    { value: "normal", label: "Moderate" },
    { value: "active", label: "Active" },
    { value: "intense", label: "Intense" },
  ];

  // Who the trip is for / the vibe you're going for (NEW)
  const tripTypeOptions = [
    "Family",
    "Friends",
    "Fun",
    "Adventure",
    "Kids",
    "Seniors",
  ];

  // A short, curated list is friendlier than every ISO currency code.
  const currencyOptions = [
    { value: "USD", label: "USD – US Dollar" },
    { value: "EUR", label: "EUR – Euro" },
    { value: "GBP", label: "GBP – British Pound" },
    { value: "INR", label: "INR – Indian Rupee" },
    { value: "JPY", label: "JPY – Japanese Yen" },
    { value: "AUD", label: "AUD – Australian Dollar" },
    { value: "CAD", label: "CAD – Canadian Dollar" },
    { value: "CNY", label: "CNY – Chinese Yuan" },
    { value: "SGD", label: "SGD – Singapore Dollar" },
    { value: "AED", label: "AED – UAE Dirham" },
    { value: "CHF", label: "CHF – Swiss Franc" },
    { value: "MXN", label: "MXN – Mexican Peso" },
    { value: "BRL", label: "BRL – Brazilian Real" },
    { value: "ZAR", label: "ZAR – South African Rand" },
  ];

  // The currency actually driving the budget slider right now, and the
  // range/formatting that goes with it.
  const activeCurrency = useUSD ? "USD" : currency;
  const budgetConfig = getBudgetConfig(activeCurrency);
  const budgetAbbrev = formatBudgetAbbrev(budgetLevel, activeCurrency);

  // If the traveler switches currency (e.g. from INR's much bigger range
  // down to USD's smaller one), make sure the slider value can't get stuck
  // above the new max.
  useEffect(() => {
    if (budgetLevel > budgetConfig.max) {
      setBudgetLevel(budgetConfig.max);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCurrency]);

  // Toggle a single interest on/off
  const toggleInterest = (value) => {
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((i) => i !== value)
        : [...prev, value]
    );
  };

  // Toggle a single trip-type tag on/off (NEW)
  const toggleTripType = (value) => {
    setTripType((prev) =>
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
          origin,
          destination,
          tripDate,
          travelers,
          budget: budgetLabelFor(budgetLevel),
          budgetValue: budgetLevel,
          currency: useUSD ? "USD" : currency,
          pace,
          durationDays,
          interests,
          tripType,
          transportation,
          wantsTransportSuggestions,
          budgetIncludesRoundTrip,
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

  // Shared by both the "Download PDF" button and the "Share to phone"
  // button, so the two never drift apart into two different layouts.
  function buildPdfDoc() {
    const titleDestination = destination || "Your Trip";
    const routeLine = origin
      ? `${origin} → ${titleDestination}`
      : titleDestination;
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
    doc.text(`Trip: ${routeLine}`, marginLeft, marginTop + 20);
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

    return doc;
  }

  function downloadAsPdf() {
    if (!result?.itinerary) return;
    buildPdfDoc().save("tripplanbuddy-itinerary.pdf");
  }

  // "Send to your phone" – there's no SMS involved (that needs a paid
  // texting service and a backend), this just uses the phone's own native
  // share sheet, which is free and built into every modern mobile browser.
  // Tapping it lets you send the itinerary straight to Messages, WhatsApp,
  // Mail, Notes, etc. On a desktop browser that doesn't have a share sheet,
  // we fall back to copying the itinerary text so you can paste it into a
  // text/email to yourself instead.
  async function shareItinerary() {
    if (!result?.itinerary) return;
    setShareMessage("");

    const titleDestination = destination || "Your Trip";
    const shareTitle = `TripPlanBuddy Itinerary – ${titleDestination}`;

    try {
      // Prefer sharing the actual PDF file, so it arrives as a proper
      // attachment instead of a wall of plain text (supported on recent
      // Android Chrome and iOS Safari 16.4+).
      if (typeof navigator !== "undefined" && navigator.canShare) {
        const blob = buildPdfDoc().output("blob");
        const file = new File([blob], "tripplanbuddy-itinerary.pdf", {
          type: "application/pdf",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: shareTitle,
            text: `Here's my trip plan for ${titleDestination}!`,
            files: [file],
          });
          return;
        }
      }

      // Next best: share the itinerary as plain text through the native
      // share sheet (still works even where file-sharing isn't supported).
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: result.itinerary,
        });
        return;
      }

      // Desktop / unsupported browsers have no share sheet at all, so just
      // copy the itinerary to the clipboard.
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(result.itinerary);
        setShareMessage(
          "Copied! On your phone's browser, tap this button instead to send it directly."
        );
      } else {
        setShareMessage(
          "Sharing isn't supported in this browser — use Download PDF instead."
        );
      }
    } catch (err) {
      // The user closing the share sheet counts as an "AbortError" — not a
      // real failure, so stay quiet about it.
      if (err?.name !== "AbortError") {
        console.error("Share failed:", err);
        setShareMessage(
          "Couldn't share automatically — use Download PDF instead and send that file yourself."
        );
      }
    }
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
                  <div className="field-row-2">
                    <div className="field">
                      <label className="label">From (optional)</label>
                      <input
                        placeholder="e.g. New York"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div className="field">
                      <label className="label">To</label>
                      <input
                        placeholder="Tokyo, Paris, Bali..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="input"
                      />
                    </div>
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

                  {/* NEW – whether to suggest actual transport/flight options */}
                  <div className="field">
                    <div className="field-label">
                      Want transportation options suggested (e.g. flights)?
                    </div>
                    <div className="yesno-row">
                      <button
                        type="button"
                        onClick={() => {
                          setWantsTransportSuggestions(true);
                          setBudgetIncludesRoundTrip(null);
                        }}
                        className={`pace-chip ${
                          wantsTransportSuggestions === true
                            ? "pace-chip--active"
                            : ""
                        }`}
                      >
                        Yes, suggest some
                      </button>
                      <button
                        type="button"
                        onClick={() => setWantsTransportSuggestions(false)}
                        className={`pace-chip ${
                          wantsTransportSuggestions === false
                            ? "pace-chip--active"
                            : ""
                        }`}
                      >
                        No, I've got it
                      </button>
                    </div>

                    {/* Only asked once they say "No" – otherwise we're the ones suggesting transport */}
                    {wantsTransportSuggestions === false && (
                      <div className="follow-up-field">
                        <div className="field-label">
                          Does your budget already include round-trip
                          tickets?
                        </div>
                        <div className="yesno-row">
                          <button
                            type="button"
                            onClick={() => setBudgetIncludesRoundTrip(true)}
                            className={`pace-chip ${
                              budgetIncludesRoundTrip === true
                                ? "pace-chip--active"
                                : ""
                            }`}
                          >
                            Yes, it's included
                          </button>
                          <button
                            type="button"
                            onClick={() => setBudgetIncludesRoundTrip(false)}
                            className={`pace-chip ${
                              budgetIncludesRoundTrip === false
                                ? "pace-chip--active"
                                : ""
                            }`}
                          >
                            No, separate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NEW – who the trip is for / the vibe */}
                  <div className="field">
                    <label className="label">
                      Who&rsquo;s this trip for? (optional)
                    </label>
                    <div className="interests-grid">
                      {tripTypeOptions.map((item) => {
                        const active = tripType.includes(item);
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
                              onChange={() => toggleTripType(item)}
                            />
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>
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

                  {/* Budget slider – range depends on the chosen currency */}
                  <div className="field">
                    <div className="field-label-row">
                      <span>Budget level (all inclusive)</span>
                      <span className="muted">
                        Approx: {useUSD ? "$" : currency + " "}
                        {budgetLevel.toLocaleString(
                          activeCurrency === "INR" ? "en-IN" : "en-US"
                        )}
                        {budgetAbbrev ? ` (${budgetAbbrev})` : ""}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={budgetConfig.max}
                      step={budgetConfig.step}
                      value={budgetLevel}
                      onChange={(e) => setBudgetLevel(Number(e.target.value))}
                      className="slider"
                    />
                    <div className="hint">
                      Drag to match your rough total budget (up to{" "}
                      {budgetConfig.max.toLocaleString(
                        activeCurrency === "INR" ? "en-IN" : "en-US"
                      )}
                      {formatBudgetAbbrev(budgetConfig.max, activeCurrency)
                        ? ` / ${formatBudgetAbbrev(
                            budgetConfig.max,
                            activeCurrency
                          )}`
                        : ""}
                      ).
                    </div>

                    {/* NEW – local currency + "use USD instead" checkbox */}
                    <div className="currency-row">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={useUSD}
                        className="input currency-select"
                      >
                        {currencyOptions.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={useUSD}
                          onChange={(e) => setUseUSD(e.target.checked)}
                        />
                        <span>I want my budget in USD</span>
                      </label>
                    </div>
                  </div>

                  {/* Duration slider, with a fallback for trips longer
                      than the slider can comfortably represent */}
                  <div className="field">
                    <div className="field-label-row">
                      <span>Duration</span>
                      <span className="muted">
                        {durationDays} {durationDays === 1 ? "day" : "days"}
                      </span>
                    </div>

                    {!useCustomDuration && (
                      <input
                        type="range"
                        min={1}
                        max={60}
                        value={durationDays}
                        onChange={(e) =>
                          setDurationDays(Number(e.target.value))
                        }
                        className="slider"
                      />
                    )}

                    {useCustomDuration && (
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={durationDays}
                        onChange={(e) => {
                          const raw = Number(e.target.value) || 1;
                          setDurationDays(
                            Math.min(Math.max(raw, 1), 365)
                          );
                        }}
                        placeholder="Enter number of days"
                        className="input custom-duration-input"
                      />
                    )}

                    <div className="hint">
                      {durationDays > 30
                        ? "Long trip! For 30+ days we'll group the plan week-by-week instead of listing every single day, so it stays readable."
                        : "Drag to match how long the trip is."}
                    </div>

                    <label className="checkbox-row custom-duration-toggle">
                      <input
                        type="checkbox"
                        checked={useCustomDuration}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUseCustomDuration(checked);
                          if (checked && durationDays < 60) {
                            setDurationDays(60);
                          }
                        }}
                      />
                      <span>
                        Trip is longer than 60 days — let me type the exact
                        number
                      </span>
                    </label>
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
                    <div className="itinerary-footer-buttons">
                      <button
                        onClick={shareItinerary}
                        className="secondary-btn primary-btn--small"
                      >
                        Share to phone
                      </button>
                      <button
                        onClick={downloadAsPdf}
                        className="primary-btn primary-btn--small"
                      >
                        Download itinerary (PDF)
                      </button>
                    </div>
                    {shareMessage && (
                      <p className="hint share-hint">{shareMessage}</p>
                    )}
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

        /* NEW – From / To side-by-side row */
        .field-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        /* NEW – Yes/No question rows (transport suggestions, round-trip) */
        .yesno-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .follow-up-field {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px dashed #e2e8f0;
        }

        /* NEW – currency dropdown + "use USD" checkbox under the budget slider */
        .currency-row {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }

        .currency-select {
          width: auto;
          flex: 1 1 200px;
        }

        .currency-select:disabled {
          background-color: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
        }

        .checkbox-row {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #334155;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-row input {
          accent-color: #4f46e5;
        }

        .custom-duration-input {
          width: 140px;
        }

        .custom-duration-toggle {
          margin-top: 10px;
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

        .secondary-btn {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #c7d2fe;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          background-color: #eef2ff;
          color: #4338ca;
          transition: background 0.15s ease;
        }

        .secondary-btn:hover {
          background-color: #e0e7ff;
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
        }

        .itinerary-footer-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .share-hint {
          margin-top: 8px;
          text-align: right;
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

          .field-row-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
