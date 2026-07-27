"use client";

import * as React from "react";
import { withRetry } from "@/lib/retry";

interface WorkOrder {
  id: string;
  status: string;
  address: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  technicianNotes: string | null;
  beforePhotos: string[];
  afterPhotos: string[];
  signatureUrl: string | null;
  safetyChecklist: Record<string, boolean> | null;
  suppliesChecklist: Record<string, boolean> | null;
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    total: string;
    items: Array<{
      product: { name: string; btu: number };
      quantity: number;
    }>;
  } | null;
}

const defaultSafetyChecklist = {
  "Area cleared for installation": false,
  "Electrical connections verified": false,
  "Drainage path confirmed": false,
  "Refrigerant levels checked": false,
  "Unit mounted securely": false,
  "All connections tight": false,
  "System tested and operational": false,
  "Customer walkthrough completed": false,
};

const defaultSuppliesChecklist = {
  "Mounting bracket": false,
  "Screws and anchors": false,
  "Copper tubing": false,
  "Drainage hose": false,
  "Electrical cable": false,
  "Wall sleeve": false,
  "Sealant/foam": false,
  "Remote control": false,
};

export default function TechnicianWorkOrderPage() {
  const [workOrders, setWorkOrders] = React.useState<WorkOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<WorkOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [safetyChecklist, setSafetyChecklist] = React.useState<Record<string, boolean>>(defaultSafetyChecklist);
  const [suppliesChecklist, setSuppliesChecklist] = React.useState<Record<string, boolean>>(defaultSuppliesChecklist);
  const [notes, setNotes] = React.useState("");
  const [signature, setSignature] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<string | null>(null);
  const fileInputBeforeRef = React.useRef<HTMLInputElement>(null);
  const fileInputAfterRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      const res = await fetch("/api/work-orders");
      const data = await res.json();
      setWorkOrders(data.workOrders || []);
    } catch {
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Photo upload flow: presign → PUT directly to storage → PATCH with key.
   * Each step is retried independently via withRetry().
   */
  async function uploadPhoto(file: File, workOrderId: string, type: "before" | "after") {
    setUploading(true);
    setUploadStatus(`Uploading ${type} photo...`);

    try {
      // Step 1: Get presigned URL (retried)
      const { uploadUrl, objectKey } = await withRetry(async () => {
        const res = await fetch(`/api/work-orders/${workOrderId}/photos/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, contentType: file.type }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to get upload URL");
        }

        return res.json();
      });

      // Step 2: PUT file directly to storage (retried)
      await withRetry(async () => {
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!putRes.ok) {
          throw new Error(`Storage upload failed: ${putRes.status}`);
        }
      });

      // Step 3: PATCH work order with the storage key (retried)
      await withRetry(async () => {
        const patchBody: Record<string, unknown> = { id: workOrderId };
        if (type === "before") {
          patchBody.beforePhotos = [...(selectedOrder?.beforePhotos || []), objectKey];
        } else {
          patchBody.afterPhotos = [...(selectedOrder?.afterPhotos || []), objectKey];
        }

        const res = await fetch("/api/work-orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });

        if (!res.ok) throw new Error("Failed to save photo reference");
        return res.json();
      });

      setUploadStatus(`${type} photo uploaded successfully`);
      fetchWorkOrders();
    } catch (err) {
      setUploadStatus(`Failed to upload ${type} photo after retries`);
      console.error("Photo upload failed:", err);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") {
    const file = e.target.files?.[0];
    if (!file || !selectedOrder) return;
    uploadPhoto(file, selectedOrder.id, type);
  }

  async function updateStatus(id: string, status: string) {
    try {
      await withRetry(async () => {
        const res = await fetch("/api/work-orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status,
            technicianNotes: notes,
            safetyChecklist,
            suppliesChecklist,
            signatureUrl: signature,
          }),
        });

        if (!res.ok) throw new Error("Update failed");
        return res.json();
      });

      fetchWorkOrders();
      setSelectedOrder(null);
    } catch {
      alert("Failed to update after retries. Check your connection.");
    }
  }

  // Canvas drawing
  function startDrawing(e: React.TouchEvent | React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
  }

  function draw(e: React.TouchEvent | React.MouseEvent) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  }

  const allSafetyChecked = Object.values(safetyChecklist).every(Boolean);
  const allSuppliesChecked = Object.values(suppliesChecklist).every(Boolean);
  const canComplete = allSafetyChecked && allSuppliesChecked && signature;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[375px] mx-auto">
      <header className="sticky top-0 z-30 border-b bg-background px-4 py-3">
        <h1 className="text-lg font-semibold">My Work Orders</h1>
      </header>

      <main className="p-4">
        {!selectedOrder ? (
          <div className="space-y-3">
            {workOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No work orders assigned.</p>
              </div>
            ) : (
              workOrders
                .sort((a, b) => {
                  if (a.scheduledTime && b.scheduledTime) {
                    return a.scheduledTime.localeCompare(b.scheduledTime);
                  }
                  return 0;
                })
                .map((wo) => (
                <button
                  key={wo.id}
                  onClick={() => {
                    setSelectedOrder(wo);
                    setSafetyChecklist(wo.safetyChecklist || defaultSafetyChecklist);
                    setSuppliesChecklist(wo.suppliesChecklist || defaultSuppliesChecklist);
                    setNotes(wo.technicianNotes || "");
                  }}
                  className="w-full text-left rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {wo.order?.orderNumber}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      wo.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      wo.status === "ON_SITE" ? "bg-purple-100 text-purple-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {wo.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="font-medium">{wo.order?.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {wo.address || wo.order?.customerAddress}
                  </p>
                  {wo.scheduledDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(wo.scheduledDate).toLocaleDateString()} {wo.scheduledTime}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-sm text-primary hover:underline"
            >
              ← Back to list
            </button>

            {/* Order Details */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {selectedOrder.order?.orderNumber}
                </span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {selectedOrder.status.replace("_", " ")}
                </span>
              </div>
              <h2 className="font-semibold text-lg">{selectedOrder.order?.customerName}</h2>
              <p className="text-sm text-muted-foreground">{selectedOrder.order?.customerPhone}</p>
              <p className="text-sm text-muted-foreground">
                {selectedOrder.address || selectedOrder.order?.customerAddress}
              </p>

              {selectedOrder.order?.items && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium mb-1">Equipment:</p>
                  {selectedOrder.order.items.map((item, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      {item.product.name} ({item.product.btu.toLocaleString()} BTU) × {item.quantity}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Photo Upload — presigned URL flow */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Photos</h3>
              {uploadStatus && (
                <p className={`text-sm mb-2 ${uploadStatus.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                  {uploadStatus}
                </p>
              )}

              <div className="space-y-3">
                {/* Before photos */}
                <div>
                  <p className="text-sm font-medium mb-1">Before Installation</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(selectedOrder.beforePhotos || []).map((photo, i) => (
                      <img key={i} src={photo} alt={`Before ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                    ))}
                  </div>
                  <input
                    ref={fileInputBeforeRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoSelect(e, "before")}
                  />
                  <button
                    onClick={() => fileInputBeforeRef.current?.click()}
                    disabled={uploading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    + Add Before Photo
                  </button>
                </div>

                {/* After photos */}
                <div>
                  <p className="text-sm font-medium mb-1">After Installation</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(selectedOrder.afterPhotos || []).map((photo, i) => (
                      <img key={i} src={photo} alt={`After ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                    ))}
                  </div>
                  <input
                    ref={fileInputAfterRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handlePhotoSelect(e, "after")}
                  />
                  <button
                    onClick={() => fileInputAfterRef.current?.click()}
                    disabled={uploading}
                    className="text-sm text-primary hover:underline disabled:opacity-50"
                  >
                    + Add After Photo
                  </button>
                </div>
              </div>
            </div>

            {/* Safety Checklist */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Safety Checklist</h3>
              <div className="space-y-2">
                {Object.entries(safetyChecklist).map(([item, checked]) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSafetyChecklist({ ...safetyChecklist, [item]: e.target.checked })}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Supplies Checklist */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Supplies Used</h3>
              <div className="space-y-2">
                {Object.entries(suppliesChecklist).map(([item, checked]) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setSuppliesChecklist({ ...suppliesChecklist, [item]: e.target.checked })}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Add notes about the installation..."
              />
            </div>

            {/* Digital Signature */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Customer Signature</h3>
              <canvas
                ref={canvasRef}
                width={300}
                height={150}
                className="w-full border rounded-md bg-white touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button
                onClick={clearSignature}
                className="mt-2 text-sm text-destructive hover:underline"
              >
                Clear signature
              </button>
            </div>

            {/* Completion Gate */}
            <div className={`rounded-lg border p-4 ${canComplete ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <h3 className="font-semibold mb-2">Ready to Complete?</h3>
              <div className="space-y-1 text-sm">
                <p className={allSafetyChecked ? "text-green-600" : "text-yellow-600"}>
                  {allSafetyChecked ? "✓" : "○"} Safety checklist ({Object.values(safetyChecklist).filter(Boolean).length}/{Object.keys(safetyChecklist).length})
                </p>
                <p className={allSuppliesChecked ? "text-green-600" : "text-yellow-600"}>
                  {allSuppliesChecked ? "✓" : "○"} Supplies checklist ({Object.values(suppliesChecklist).filter(Boolean).length}/{Object.keys(suppliesChecklist).length})
                </p>
                <p className={signature ? "text-green-600" : "text-yellow-600"}>
                  {signature ? "✓" : "○"} Customer signature
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {selectedOrder.status === "ASSIGNED" && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, "EN_ROUTE")}
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Start Route
                </button>
              )}
              {selectedOrder.status === "EN_ROUTE" && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, "ON_SITE")}
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Arrived On Site
                </button>
              )}
              {selectedOrder.status === "ON_SITE" && (
                <button
                  onClick={() => updateStatus(selectedOrder.id, "IN_PROGRESS")}
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Start Work
                </button>
              )}
              {selectedOrder.status === "IN_PROGRESS" && (
                <button
                  onClick={() => {
                    if (!canComplete) {
                      alert("Please complete all checklists and get customer signature before finishing.");
                      return;
                    }
                    updateStatus(selectedOrder.id, "COMPLETED");
                  }}
                  disabled={!canComplete}
                  className="w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Job
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
