import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Combinable filters
    const type = searchParams.get("type");
    const minBtu = searchParams.get("minBtu");
    const maxBtu = searchParams.get("maxBtu");
    const energyRating = searchParams.get("energyRating");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { isActive: true };

    if (type) where.type = type;
    if (energyRating) where.energyRating = energyRating;
    if (brand) where.brand = brand;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { modelNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    if (minBtu || maxBtu) {
      where.btu = {};
      if (minBtu) (where.btu as Record<string, number>).gte = parseInt(minBtu);
      if (maxBtu) (where.btu as Record<string, number>).lte = parseInt(maxBtu);
    }

    const products = await db.product.findMany({
      where,
      orderBy: { price: "asc" },
    });

    // Get distinct brands and types for filter options
    const [brands, types] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { brand: true },
        distinct: ["brand"],
      }),
      db.product.findMany({
        where: { isActive: true },
        select: { type: true },
        distinct: ["type"],
      }),
    ]);

    return NextResponse.json({
      products,
      filters: {
        brands: brands.map((b) => b.brand).sort(),
        types: types.map((t) => t.type),
        energyRatings: ["A+", "A", "B", "C"],
      },
    });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch products" } },
      { status: 500 }
    );
  }
}
