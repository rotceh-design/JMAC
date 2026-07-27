import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

export const quoteRequestSchema = z.object({
  area: z.number().min(1, "Area must be at least 1 m²").max(500, "Area too large"),
  sunExposure: z.enum(["low", "medium", "high"]),
  roomType: z.enum(["bedroom", "living", "office", "commercial", "other"]),
  floors: z.number().min(1).max(5).optional(),
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(8),
  customerAddress: z.string().min(5),
  paymentMethod: z.enum(["FULL", "DEPOSIT"]),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })).min(1),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
});
