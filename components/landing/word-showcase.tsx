const SHOWCASE_WORDS = [
  {
    text: "Reluctant",
    pos: "adjective",
    definition: "Not willing or eager to do something.",
    className: "rotate-[-4deg] top-0 left-4 sm:left-10",
  },
  {
    text: "Convey",
    pos: "verb",
    definition: "To communicate or make known.",
    className: "rotate-[3deg] top-16 right-0 sm:right-4",
  },
  {
    text: "Meticulous",
    pos: "adjective",
    definition: "Showing great attention to detail.",
    className: "rotate-[2deg] top-52 left-0",
  },
  {
    text: "Ambiguous",
    pos: "adjective",
    definition: "Open to more than one interpretation.",
    className: "rotate-[-3deg] top-64 right-6 sm:right-12",
  },
] as const;

/**
 * Decorative floating flashcard collage for the landing page hero — the
 * "several offset tiles" composition is a common modern-SaaS pattern; here
 * each tile is an actual vocabulary card in the app's own visual language
 * (word / part of speech / definition) rather than generic icon art, so it
 * doubles as an honest product preview instead of pure decoration.
 */
export function WordShowcase() {
  return (
    <div className="relative hidden h-[340px] w-full max-w-md lg:block" aria-hidden="true">
      {SHOWCASE_WORDS.map((word) => (
        <div
          key={word.text}
          className={`shadow-brutal absolute w-52 rounded-xl border-2 border-foreground bg-card p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:rotate-0 hover:shadow-brutal-lg ${word.className}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">{word.text}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground italic">
              {word.pos}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{word.definition}</p>
        </div>
      ))}
    </div>
  );
}
