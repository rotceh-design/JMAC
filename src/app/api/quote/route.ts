import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Quote calculator API.
 * Acceptance criteria:
 * - Area 0 m² → rejected with 400
 * - Area > 500 m² → rejected with 400
 * - Negative values → rejected with 400
 * - Valid input → recommendation + price range
 */

interface QuoteRequest {
  area: number;
  sunExposure: string;
  roomType: string;
  floors: number;
}

function validateQuoteInput(data: unknown): { valid: boolean; error?: string; data?: QuoteRequest } {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Request body required" };
  }

  const body = data as Record<string, unknown>;

  const area = Number(body.area);
  if (isNaN(area) || area <= 0) {
    return { valid: false, error: "Area must be a positive number greater than 0" };
  }
  if (area > 500) {
    return { valid: false, error: "Area cannot exceed 500 m² for standard installation" };
  }

  const floors = Number(body.floors) || 1;
  if (floors < 1 || floors > 10) {
    return { valid: false, error: "Floors must be between 1 and 10" };
  }

  const validSunExposures = ["low", "medium", "high"];
  const sunExposure = validSunExposures.includes(body.sunExposure as string)
    ? (body.sunExposure as string)
    : "medium";

  const validRoomTypes = ["bedroom", "living", "office", "commercial", "other"];
  const roomType = validRoomTypes.includes(body.roomType as string)
    ? (body.roomType as string)
    : "living";

  return {
    valid: true,
    data: { area, sunExposure, roomType, floors },
  };
}

function calculateBTU(area: number, sunExposure: string, roomType: string, floors: number): number {
  // Base: 600 BTU per m², adjusted for floors
  let btu = area * 600 * Math.sqrt(floors);

  // Sun exposure adjustment
  const sunMultipliers: Record<string, number> = {
    low: 0.8,
    medium: 1.0,
    high: 1.2,
  };
  btu *= sunMultipliers[sunExposure] || 1.0;

  // Room type adjustment
  const roomMultipliers: Record<string, number> = {
    bedroom: 0.9,
    living: 1.0,
    office: 1.1,
    commercial: 1.3,
    other: 1.0,
  };
  btu *= roomMultipliers[roomType] || 1.0;

  return Math.round(btu / 100) * 100; // Round to nearest 100
}

function recommendProducts(
  btu: number,
  products: Array<{ btu: number; price: { toString(): string }; name: string; type: string; id: string; energyRating: string; slug: string; imageUrl: string | null; brand: string; modelNumber: string }>
) {
  // Find products within ±25% of calculated BTU
  const minBtu = btu * 0.75;
  const maxBtu = btu * 1.25;

  const matches = products.filter((p) => p.btu >= minBtu && p.btu <= maxBtu);

  if (matches.length === 0) {
    // If no matches, find closest 3
    const sorted = [...products].sort((a, b) => Math.abs(a.btu - btu) - Math.abs(b.btu - btu));
    return sorted.slice(0, 3);
  }

  // Sort by best value (price per BTU)
  return matches
    .sort((a, b) => {
      const pricePerBtuA = parseFloat(a.price.toString()) / a.btu;
      const pricePerBtuB = parseFloat(b.price.toString()) / b.btu;
      return pricePerBtuA - pricePerBtuB;
    })
    .slice(0, 3);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateQuoteInput(body);

    if (!validation.valid) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: validation.error } },
        { status: 400 }
      );
    }

    const { area, sunExposure, roomType, floors } = validation.data!;
    const recommendedBTU = calculateBTU(area, sunExposure, roomType, floors);

    // Fetch all active products
    const products = await db.product.findMany({
      where: { isActive: true },
    });

    const recommendations = recommendProducts(recommendedBTU, products);

    const priceRange = recommendations.length > 0
      ? {
          min: Math.min(...recommendations.map((p) => parseFloat(p.price.toString()))),
          max: Math.max(...recommendations.map((p) => parseFloat(p.price.toString()))),
        }
      : { min: 0, max: 0 };

    return NextResponse.json({
      calculation: {
        area,
        sunExposure,
        roomType,
        floors,
        recommendedBTU,
      },
      recommendations,
      priceRange,
    });
  } catch (error) {
    console.error("Quote calculation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to calculate quote" } },
      { status: 500 }
    );
  }
}
