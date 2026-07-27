import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="font-bold text-lg">
            Jhon Aire
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/catalog" className="text-sm text-muted-foreground hover:text-foreground">
              Catalog
            </Link>
            <Link href="/quote" className="text-sm text-muted-foreground hover:text-foreground">
              Get a Quote
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Professional Climate Control
          </h1>
          <p className="text-lg text-muted-foreground">
            Expert HVAC installation, maintenance, and repair services.
            Get a personalized quote in minutes.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/quote"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Free Quote
            </Link>
            <Link
              href="/catalog"
              className="rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              Browse Products
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            {
              title: "Expert Installation",
              description: "Certified technicians with years of experience in all HVAC systems.",
            },
            {
              title: "Fast Response",
              description: "Same-day service available. We respect your time.",
            },
            {
              title: "Warranty Included",
              description: "All installations come with comprehensive warranty coverage.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border bg-card p-6 shadow-sm text-center"
            >
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Jhon Aire. All rights reserved.</p>
      </footer>
    </div>
  );
}
