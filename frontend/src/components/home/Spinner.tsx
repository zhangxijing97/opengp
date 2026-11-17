// A small ring that spins while something is loading. It is still, but still there, under reduced motion, so it
// keeps reading as "busy" (the text next to it says what is loading).
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-3.5 rounded-(--radius-full) border-2 border-current border-t-transparent motion-safe:animate-spin ${className}`}
    />
  );
}
