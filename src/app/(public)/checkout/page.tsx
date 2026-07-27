"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEPOSIT_RATE } from "@/lib/payments/config";

interface SelectedProduct {
  id: string;
  name: string;
  brand: string;
  price: string;
  btu: number;
  type: string;
  energyRating: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [product, setProduct] = React.useState<SelectedProduct | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [step, setStep] = React.useState<"info" | "payment" | "confirm">("info");

  const [form, setForm] = React.useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    paymentMethod: "FULL" as "FULL" | "DEPOSIT",
    notes: "",
  });

  React.useEffect(() => {
    const stored = sessionStorage.getItem("selectedProduct");
    if (stored) {
      setProduct(JSON.parse(stored));
    }
  }, []);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">No product selected.</p>
          <Link href="/quote" className="text-primary hover:underline">
            Start a new quote
          </Link>
        </div>
      </div>
    );
  }

  const price = parseFloat(product.price);
  const tax = price * 0.19;
  const total = price + tax;
  const depositAmount = total * DEPOSIT_RATE;
  const balanceDue = total - depositAmount;
  const isDeposit = form.paymentMethod === "DEPOSIT";
  const dueNow = isDeposit ? depositAmount : total;

  async function handleSubmit() {
    if (!product) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: [{ productId: product.id, quantity: 1 }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Order failed");

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        sessionStorage.removeItem("selectedProduct");
        sessionStorage.removeItem("quoteData");
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">Jhon Aire</Link>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Catalog</Link>
            <Link href="/quote" className="text-sm text-muted-foreground hover:text-foreground">Quote</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="rounded-lg border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-4">Order Summary</h2>
          <div className="flex items-center justify-between p-4 rounded-md bg-muted">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {product.brand} · {product.type} · {product.btu.toLocaleString()} BTU
              </p>
            </div>
            <p className="font-bold">${price.toLocaleString()}</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (19%)</span>
              <span>${tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span>${total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Step: Customer Info */}
        {step === "info" && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-4">Customer Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="juan@ejemplo.cl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Installation Address</label>
                  <textarea
                    value={form.customerAddress}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Av. Libertador 1234, Depto 501, Santiago"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep("payment")}
              disabled={!form.customerName || !form.customerEmail || !form.customerPhone || !form.customerAddress}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Continue to Payment
            </button>
          </div>
        )}

        {/* Step: Payment Method */}
        {step === "payment" && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setForm({ ...form, paymentMethod: "FULL" })}
                  className={`w-full p-4 rounded-md border text-left ${
                    form.paymentMethod === "FULL"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Full Payment</p>
                      <p className="text-sm text-muted-foreground">Pay ${total.toLocaleString()} now</p>
                    </div>
                    {form.paymentMethod === "FULL" && <span className="text-primary">✓</span>}
                  </div>
                </button>
                <button
                  onClick={() => setForm({ ...form, paymentMethod: "DEPOSIT" })}
                  className={`w-full p-4 rounded-md border text-left ${
                    form.paymentMethod === "DEPOSIT"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{Math.round(DEPOSIT_RATE * 100)}% Deposit</p>
                      <p className="text-sm text-muted-foreground">
                        Pay ${depositAmount.toLocaleString()} now, ${balanceDue.toLocaleString()} on completion
                      </p>
                    </div>
                    {form.paymentMethod === "DEPOSIT" && <span className="text-primary">✓</span>}
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("info")}
                className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Review Order
              </button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="font-semibold mb-4">Confirm Order</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span>{form.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{form.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{form.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right max-w-[60%]">{form.customerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span>{isDeposit ? `${Math.round(DEPOSIT_RATE * 100)}% Deposit` : "Full Payment"}</span>
                </div>
                {isDeposit && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deposit Due Now</span>
                      <span>${depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Due on Completion</span>
                      <span>${balanceDue.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>{isDeposit ? "Amount Due Now" : "Total"}</span>
                  <span>${dueNow.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("payment")}
                className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Pay Now"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You&apos;ll be redirected to our secure payment provider.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
