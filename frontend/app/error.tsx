"use client";

/** Root error boundary — fails gracefully with a retry surface (FAD §8.1). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred{error.digest ? ` (${error.digest})` : ""}. Your work is safe.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
