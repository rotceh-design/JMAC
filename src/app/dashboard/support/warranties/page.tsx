"use client";

import * as React from "react";

interface Warranty {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  installDate: string;
  customerName: string;
  customerEmail: string;
  warrantyMonths: number;
  product: { name: string } | null;
}

export default function WarrantiesPage() {
  const [warranties, setWarranties] = React.useState<Warranty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    fetchWarranties();
  }, []);

  async function fetchWarranties(query?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) {
        if (query.includes("@")) params.set("email", query);
        else params.set("serialNumber", query);
      }

      const res = await fetch(`/api/warranties?${params}`);
      const data = await res.json();
      setWarranties(data.warranties || []);
    } catch {
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    fetchWarranties(search);
  }

  function getWarrantyStatus(warranty: Warranty) {
    const installDate = new Date(warranty.installDate);
    const expiryDate = new Date(installDate);
    expiryDate.setMonth(expiryDate.getMonth() + warranty.warrantyMonths);

    const now = new Date();
    const sixMonths = new Date(installDate);
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    const twelveMonths = new Date(installDate);
    twelveMonths.setMonth(twelveMonths.getMonth() + 12);

    if (now > expiryDate) return { label: "Expired", color: "text-muted-foreground" };
    if (now > twelveMonths) return { label: "Extended Warranty", color: "text-green-600" };
    if (now > sixMonths) return { label: "6-Month Alert", color: "text-yellow-600" };
    return { label: "Active", color: "text-green-600" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipment Registry</h1>
        <p className="text-muted-foreground">Search by serial number or customer email</p>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Serial number or email..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : warranties.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          No equipment found. Try a different search.
        </div>
      ) : (
        <div className="space-y-3">
          {warranties.map((w) => {
            const status = getWarrantyStatus(w);
            return (
              <div key={w.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-mono text-sm">{w.serialNumber}</p>
                    <p className="font-medium">{w.product?.name || w.model}</p>
                  </div>
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <div>
                    <p className="text-muted-foreground">Brand</p>
                    <p>{w.brand}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Install Date</p>
                    <p>{new Date(w.installDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p>{w.customerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warranty</p>
                    <p>{w.warrantyMonths} months</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
