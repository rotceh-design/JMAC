"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Recommendation {
  id: string;
  name: string;
  brand: string;
  type: string;
  btu: number;
  energyRating: string;
  price: string;
  imageUrl: string | null;
  slug: string;
  modelNumber: string;
}

export default function QuotePage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    calculation: { area: number; sunExposure: string; roomType: string; floors: number; recommendedBTU: number };
    recommendations: Recommendation[];
    priceRange: { min: number; max: number };
  } | null>(null);

  const [formData, setFormData] = React.useState({
    area: "",
    sunExposure: "medium",
    roomType: "living",
    floors: "1",
  });

  const totalSteps = 3;

  async function handleCalculate() {
    setError("");
    const area = parseFloat(formData.area);

    if (isNaN(area) || area <= 0) {
      setError("Area must be a positive number");
      return;
    }
    if (area > 500) {
      setError("Area cannot exceed 500 m² for standard installation. Contact us for commercial projects.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area,
          sunExposure: formData.sunExposure,
          roomType: formData.roomType,
          floors: parseInt(formData.floors),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Calculation failed");

      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProduct(product: Recommendation) {
    sessionStorage.setItem("selectedProduct", JSON.stringify(product));
    sessionStorage.setItem("quoteData", JSON.stringify(result?.calculation));
    router.push("/checkout");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">Jhon Aire</Link>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Catalog</Link>
            <Link href="/quote" className="text-sm font-medium">Quote</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Get a Free Quote</h1>
        <p className="text-muted-foreground mb-8">
          Tell us about your space and we&apos;ll recommend the perfect climate solution.
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <React.Fragment key={i}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i + 1 <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`flex-1 h-1 ${i + 1 < step ? "bg-primary" : "bg-muted"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* Step 1: Room Size */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Room Size</h2>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Area in m²: <span className="font-bold text-lg">{formData.area || "—"}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="200"
                  value={formData.area || "20"}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5 m²</span>
                  <span>200 m²</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  For areas over 200 m², <Link href="/quote" className="text-primary hover:underline">contact us</Link> for a custom commercial quote.
                </p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Number of Floors</label>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormData({ ...formData, floors: f })}
                      className={`p-3 rounded-md border text-center text-sm font-medium ${
                        formData.floors === f
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      {f} {parseInt(f) === 1 ? "Floor" : "Floors"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const area = parseFloat(formData.area);
                if (!formData.area || isNaN(area) || area <= 0) {
                  setError("Please enter a valid area");
                  return;
                }
                setError("");
                setStep(2);
              }}
              disabled={!formData.area}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Room Conditions</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Sun Exposure</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "low", label: "Low", desc: "Shaded / North-facing" },
                    { value: "medium", label: "Medium", desc: "Partial sun" },
                    { value: "high", label: "High", desc: "Direct sun / South-facing" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, sunExposure: opt.value })}
                      className={`p-3 rounded-md border text-left ${
                        formData.sunExposure === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className="block font-medium text-sm">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground mt-1">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Room Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "bedroom", label: "Bedroom" },
                    { value: "living", label: "Living Room" },
                    { value: "office", label: "Office" },
                    { value: "commercial", label: "Commercial" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, roomType: opt.value })}
                      className={`p-3 rounded-md border text-left ${
                        formData.roomType === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-input hover:bg-accent"
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleCalculate}
                disabled={loading}
                className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Calculating..." : "Get Recommendation"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Your Recommendation</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Room Area</p>
                  <p className="font-semibold">{result.calculation.area} m²</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Recommended BTU</p>
                  <p className="font-semibold">{result.calculation.recommendedBTU.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Sun Exposure</p>
                  <p className="font-semibold capitalize">{result.calculation.sunExposure}</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="text-xs text-muted-foreground">Price Range</p>
                  <p className="font-semibold">
                    ${result.priceRange.min.toLocaleString()} — ${result.priceRange.max.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Recommended Products</h3>
              <div className="space-y-3">
                {result.recommendations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No products match your requirements. Try adjusting your criteria.
                  </p>
                ) : (
                  result.recommendations.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 rounded-md border hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.brand} · {product.type} · {product.btu.toLocaleString()} BTU · {product.energyRating}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${parseFloat(product.price).toLocaleString()}</p>
                        <button
                          onClick={() => handleSelectProduct(product)}
                          className="text-sm text-primary hover:underline mt-1"
                        >
                          Select →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => { setStep(1); setResult(null); setError(""); setFormData({ area: "", sunExposure: "medium", roomType: "living", floors: "1" }); }}
              className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
            >
              Start Over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
