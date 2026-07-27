export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod: "FULL" | "DEPOSIT";
  paidAt: Date;
}

export function generateReceiptHtml(data: ReceiptData): string {
  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${item.unitPrice.toLocaleString()}</td>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${item.total.toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const paymentLabel = data.paymentMethod === "DEPOSIT" ? "Deposit Payment" : "Full Payment";

  const balanceRow =
    data.paymentMethod === "DEPOSIT"
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;">
           <span style="color:#6b7280;">Balance Due on Completion</span>
           <span>$${data.amountDue.toLocaleString()}</span>
         </div>`
      : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
<div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="margin:0;font-size:24px;color:#111827;">Jhon Aire</h1>
    <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Climate Control Services</p>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <h2 style="margin:0;font-size:20px;color:#374151;">Payment Receipt</h2>
    <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Order ${data.orderNumber}</p>
  </div>
  <div style="margin-bottom:24px;padding:16px;background:#f3f4f6;border-radius:6px;">
    <p style="margin:0;font-size:14px;color:#374151;">
      <strong>Customer:</strong> ${data.customerName}<br/>
      <strong>Email:</strong> ${data.customerEmail}<br/>
      <strong>Date:</strong> ${data.paidAt.toLocaleDateString("es-CL")} ${data.paidAt.toLocaleTimeString("es-CL")}
    </p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <thead><tr style="background:#f9fafb;">
      <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Item</th>
      <th style="padding:12px;text-align:center;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
      <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Price</th>
      <th style="padding:12px;text-align:right;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb;">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="border-top:2px solid #e5e7eb;padding-top:16px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#6b7280;">Subtotal</span><span>$${data.subtotal.toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#6b7280;">IVA (19%)</span><span>$${data.tax.toLocaleString()}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:18px;border-top:1px solid #e5e7eb;padding-top:8px;margin-bottom:8px;"><span>Total</span><span>$${data.total.toLocaleString()}</span></div>
  </div>
  <div style="background:#ecfdf5;border-radius:6px;padding:16px;margin-top:16px;">
    <p style="margin:0;font-size:14px;color:#065f46;">
      <strong>${paymentLabel}</strong><br/>
      Amount Paid: <strong>$${data.amountPaid.toLocaleString()}</strong><br/>
      ${balanceRow}
    </p>
  </div>
  <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Thank you for your purchase!</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Jhon Aire - Climate Control Services</p>
  </div>
</div>
</body></html>`;
}
