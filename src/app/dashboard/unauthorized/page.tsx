import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-destructive">403</h1>
        <p className="text-lg text-muted-foreground">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
