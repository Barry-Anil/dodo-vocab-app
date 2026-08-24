interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: string;
}

/**
 * Phase 1 stands up every route behind auth with a consistent placeholder —
 * real content for each lands in the phase noted. Keeping one component for
 * this (rather than duplicating markup per page) means the "coming soon"
 * treatment stays consistent and is trivial to delete page-by-page as each
 * phase replaces it.
 */
export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{phase}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
