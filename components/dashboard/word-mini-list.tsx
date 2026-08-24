import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MiniWord {
  wordId: string;
  text: string;
  definition: string | null;
  cefrLevel: string | null;
}

interface Props {
  title: string;
  words: MiniWord[];
  emptyMessage: string;
}

export function WordMiniList({ title, words, emptyMessage }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {words.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {words.map((word) => (
              <li key={word.wordId}>
                <Link
                  href={`/vocabulary/${word.wordId}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-all duration-150 ease-out hover:translate-x-0.5 hover:bg-accent"
                >
                  <span>
                    <span className="font-medium capitalize">{word.text}</span>{" "}
                    <span className="text-sm text-muted-foreground">
                      {word.definition ? `— ${word.definition}` : ""}
                    </span>
                  </span>
                  {word.cefrLevel ? (
                    <Badge variant="outline" className="shrink-0 font-mono">
                      {word.cefrLevel}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
