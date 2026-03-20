import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  theme?: string;
}

export function ModulePlaceholder({ title, description, theme }: ModulePlaceholderProps) {
  return (
    <div data-theme={theme}>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
          {title}
        </h1>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
