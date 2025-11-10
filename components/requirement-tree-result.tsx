"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { RequirementResult } from "@/lib/types";

interface RequirementTreeResultProps {
  requirement: RequirementResult;
  unit: "hours" | "occurrences";
  formatValue: (value: number) => string;
}

export function RequirementTreeResult({
  requirement,
  unit,
  formatValue,
}: RequirementTreeResultProps) {
  if (requirement.type === "simple") {
    const isMinimum = requirement.constraint === "minimum";
    const value = isMinimum ? requirement.achieved ?? 0 : requirement.used ?? 0;
    const progress = Math.min((value / requirement.target) * 100, 100);

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">
            <span className="capitalize text-muted-foreground mr-2">
              {requirement.constraint}
            </span>
            {requirement.attributes.length > 0
              ? requirement.attributes.join(" + ")
              : "Total"}
          </span>
          <span className="text-muted-foreground">
            {formatValue(value)} / {formatValue(requirement.target)} {unit}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isMinimum
                ? "bg-primary"
                : progress > 95
                ? "bg-destructive"
                : "bg-yellow-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center">
        <span style={{ writingMode: "vertical-rl" }} className="rotate-180">
          {requirement.operator}
        </span>
      </div>
      <div className="flex-1 border-l-2 border-border pl-4 space-y-3">
        {requirement.children.map((child) => (
          <RequirementTreeResult
            key={child.id}
            requirement={child}
            unit={unit}
            formatValue={formatValue}
          />
        ))}
      </div>
    </div>
  );
}
