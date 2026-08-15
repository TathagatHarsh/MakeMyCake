import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-4 text-center">
      <div>
        <p className="text-meta text-steel">404</p>
        <h1 className="mt-2 text-3xl">Nothing on this shelf</h1>
        <p className="mt-2 text-body leading-relaxed text-steel">
          The page you were after isn&rsquo;t here. The cake builder is, though.
        </p>
        <Link
          href="/build/shape"
          className="mt-6 inline-block rounded-sm bg-ink px-4 py-2 text-meta text-paper"
        >
          Build a cake
        </Link>
      </div>
    </main>
  );
}
