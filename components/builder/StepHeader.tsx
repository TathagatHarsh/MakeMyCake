export function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl leading-tight">{title}</h1>
      <p className="mt-1 text-body text-steel">{hint}</p>
    </header>
  );
}
