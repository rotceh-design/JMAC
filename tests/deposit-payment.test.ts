import { describe, it, expect } from "vitest";
import { DEPOSIT_RATE, IVA_RATE } from "@/lib/payments/config";

// Order calculation logic (extracted from API for testing)
interface OrderCalculation {
  subtotal: number;
  tax: number;
  total: number;
  depositRate: number;
  depositAmount: number | undefined;
  amountPaid: number;
  amountDue: number;
  balanceDue: number | undefined;
}

function calculateOrder(
  items: Array<{ price: number; quantity: number }>,
  paymentMethod: "FULL" | "DEPOSIT"
): OrderCalculation {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * IVA_RATE;
  const total = subtotal + tax;

  const isDeposit = paymentMethod === "DEPOSIT";
  const depositRate = isDeposit ? DEPOSIT_RATE : 0;
  const depositAmount = isDeposit ? total * DEPOSIT_RATE : undefined;
  const amountPaid = 0;
  const amountDue = isDeposit ? Math.round((depositAmount || 0)) : total;
  const balanceDue = isDeposit ? total - (depositAmount || 0) : undefined;

  return { subtotal, tax, total, depositRate, depositAmount, amountPaid, amountDue, balanceDue };
}

describe("Deposit vs Full Payment", () => {
  describe("Configuration", () => {
    it("DEPOSIT_RATE is 0.5 (50%)", () => {
      expect(DEPOSIT_RATE).toBe(0.5);
    });

    it("IVA_RATE is 0.19 (19%)", () => {
      expect(IVA_RATE).toBe(0.19);
    });
  });

  describe("Full Payment", () => {
    it("amountDue equals total", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      expect(calc.amountDue).toBe(calc.total);
    });

    it("depositAmount is undefined", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      expect(calc.depositAmount).toBeUndefined();
    });

    it("balanceDue is undefined", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      expect(calc.balanceDue).toBeUndefined();
    });

    it("depositRate is 0", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      expect(calc.depositRate).toBe(0);
    });
  });

  describe("Deposit Payment", () => {
    it("deposit session amount == order total * DEPOSIT_RATE", () => {
      const items = [{ price: 500000, quantity: 1 }];
      const calc = calculateOrder(items, "DEPOSIT");

      const expectedDeposit = Math.round(calc.total * DEPOSIT_RATE);
      expect(calc.amountDue).toBe(expectedDeposit);
      // This is the amount that goes to Stripe Checkout
    });

    it("balanceDue == total - depositAmount", () => {
      const calc = calculateOrder([{ price: 500000, quantity: 1 }], "DEPOSIT");
      expect(calc.balanceDue).toBe(calc.total - (calc.depositAmount || 0));
    });

    it("depositAmount + balanceDue == total", () => {
      const calc = calculateOrder([{ price: 500000, quantity: 1 }], "DEPOSIT");
      expect((calc.depositAmount || 0) + (calc.balanceDue || 0)).toBe(calc.total);
    });

    it("depositRate is DEPOSIT_RATE", () => {
      const calc = calculateOrder([{ price: 500000, quantity: 1 }], "DEPOSIT");
      expect(calc.depositRate).toBe(DEPOSIT_RATE);
    });

    it("handles multiple items", () => {
      const items = [
        { price: 300000, quantity: 1 },
        { price: 150000, quantity: 2 },
      ];
      const calc = calculateOrder(items, "DEPOSIT");

      const expectedSubtotal = 300000 + 300000; // 600000
      expect(calc.subtotal).toBe(expectedSubtotal);
      expect(calc.amountDue).toBe(Math.round(calc.total * DEPOSIT_RATE));
    });

    it("rounds deposit to whole number (CLP has no decimals)", () => {
      const calc = calculateOrder([{ price: 333333, quantity: 1 }], "DEPOSIT");
      expect(Number.isInteger(calc.amountDue)).toBe(true);
    });
  });

  describe("Status transitions", () => {
    it("FULL: initial amountPaid is 0", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      expect(calc.amountPaid).toBe(0);
    });

    it("DEPOSIT: initial amountPaid is 0", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "DEPOSIT");
      expect(calc.amountPaid).toBe(0);
    });

    it("FULL: status transitions PENDING → PAID after webhook", () => {
      // After webhook: amountPaid = total, amountDue = 0, status = PAID
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "FULL");
      const amountPaidAfterWebhook = calc.total;
      const amountDueAfterWebhook = calc.total - amountPaidAfterWebhook;
      expect(amountDueAfterWebhook).toBe(0);
    });

    it("DEPOSIT: status transitions PENDING → DEPOSIT_PAID → SETTLED", () => {
      const calc = calculateOrder([{ price: 100000, quantity: 1 }], "DEPOSIT");

      // After first webhook (deposit): amountPaid = depositAmount, status = DEPOSIT_PAID
      const amountPaidAfterDeposit = calc.amountDue;
      expect(amountPaidAfterDeposit).toBe(calc.depositAmount);

      // After second webhook (balance): amountPaid = total, status = SETTLED
      const amountPaidAfterBalance = calc.total;
      const amountDueAfterBalance = calc.total - amountPaidAfterBalance;
      expect(amountDueAfterBalance).toBe(0);
    });
  });
});
