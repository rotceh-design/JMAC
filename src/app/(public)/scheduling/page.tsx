"use client";

import * as React from "react";
import Link from "next/link";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function SchedulingPage() {
  const [selectedDate, setSelectedDate] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [booked, setBooked] = React.useState(false);

  React.useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  async function fetchSlots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduling?date=${selectedDate}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleBookSlot(slot: TimeSlot) {
    try {
      const res = await fetch("/api/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Booking failed");
      }

      setBooked(true);
      fetchSlots();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Booking failed");
    }
  }

  // Get min date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  // Get max date (30 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">Jhon Aire</Link>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">Catalog</Link>
            <Link href="/quote" className="text-sm text-muted-foreground hover:text-foreground">Quote</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Schedule Installation</h1>
        <p className="text-muted-foreground mb-8">
          Choose a date and time for your installation.
        </p>

        {booked && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-6 text-green-800">
            <p className="font-medium">Time slot booked successfully!</p>
            <p className="text-sm mt-1">
              We&apos;ll send you a confirmation email with the details.
            </p>
          </div>
        )}

        {/* Date Selection */}
        <div className="rounded-lg border bg-card p-6 mb-6">
          <h2 className="font-semibold mb-4">Select Date</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setBooked(false); }}
            min={minDateStr}
            max={maxDateStr}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {/* Time Slots */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Available Times</h2>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No time slots available for this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  onClick={() => slot.isAvailable && handleBookSlot(slot)}
                  disabled={!slot.isAvailable}
                  className={`p-3 rounded-md border text-sm font-medium ${
                    slot.isAvailable
                      ? "border-input hover:bg-accent hover:border-primary"
                      : "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {slot.startTime}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border border-input" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted/50 border border-muted" />
              <span>Booked</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
