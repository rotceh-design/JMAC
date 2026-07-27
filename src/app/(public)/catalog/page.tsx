"use client";

import * as React from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  type: string;
  btu: number;
  energyRating: string;
  price: string;
  imageUrl: string | null;
  modelNumber: string;
}

interface Filters {
  brands: string[];
  types: string[];
  energyRatings: string[];
}

export default function CatalogPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [filterOptions, setFilterOptions] = React.useState<Filters>({
    brands: [],
    types: [],
    energyRatings: [],
  });
  const [loading, setLoading] = React.useState(true);

  // Combinable filters — all independent, no page reload
  const [filters, setFilters] = React.useState({
    type: "",
    minBtu: "",
    maxBtu: "",
    energyRating: "",
    brand: "",
    search: "",
  });

  // Debounced search
  const [searchInput, setSearchInput] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  React.useEffect(() => {
    fetchProducts();
  }, [filters]);

  async function fetchProducts() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.minBtu) params.set("minBtu", filters.minBtu);
    if (filters.maxBtu) params.set("maxBtu", filters.maxBtu);
    if (filters.energyRating) params.set("energyRating", filters.energyRating);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.search) params.set("search", filters.search);

    try {
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      if (data.filters) setFilterOptions(data.filters);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setFilters({ type: "", minBtu: "", maxBtu: "", energyRating: "", brand: "", search: "" });
    setSearchInput("");
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">Jhon Aire</Link>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm font-medium">Catalog</Link>
            <Link href="/quote" className="text-sm text-muted-foreground hover:text-foreground">Quote</Link>
            <Link href="/scheduling" className="text-sm text-muted-foreground hover:text-foreground">Schedule</Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Product Catalog</h1>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, brand, or model..."
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm"
          />
        </div>

        {/* Combinable Filters — no page reload */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-lg border bg-card">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              {filterOptions.types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Brand</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Brands</option>
              {filterOptions.brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Min BTU</label>
            <input
              type="number"
              value={filters.minBtu}
              onChange={(e) => setFilters({ ...filters, minBtu: e.target.value })}
              placeholder="9,000"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm w-24"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Max BTU</label>
            <input
              type="number"
              value={filters.maxBtu}
              onChange={(e) => setFilters({ ...filters, maxBtu: e.target.value })}
              placeholder="60,000"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm w-24"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">Efficiency</label>
            <select
              value={filters.energyRating}
              onChange={(e) => setFilters({ ...filters, energyRating: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Ratings</option>
              {filterOptions.energyRatings.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="text-sm text-destructive hover:underline"
              >
                Clear all ({activeFilterCount})
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? "Loading..." : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
        </p>

        {/* Products Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p className="text-lg">No products found matching your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-primary hover:underline">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                {product.imageUrl && (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-md mb-4" />
                )}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.brand} · {product.modelNumber}</p>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                    {product.energyRating}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{product.type}</span>
                  <span>{product.btu.toLocaleString()} BTU</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">
                    ${parseFloat(product.price).toLocaleString()}
                  </span>
                  <Link
                    href={`/quote?product=${product.slug}`}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Get Quote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
