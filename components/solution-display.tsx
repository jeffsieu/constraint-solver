"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { PieChart } from "@/components/pie-chart";
import type { Solution, Record } from "@/lib/types";

interface SolutionDisplayProps {
  solution: Solution;
  records: Record[];
  unit: "hours" | "occurrences";
  targetValue: number;
  hoveredRecordId?: string | null;
  onHoverRecord?: (id: string | null) => void;
}

export function SolutionDisplay({
  solution,
  records,
  unit,
  targetValue,
  hoveredRecordId,
  onHoverRecord,
  showCard = true,
}: SolutionDisplayProps & { showCard?: boolean }) {
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  const formatValue = (value: number) =>
    unit === "occurrences" ? Math.round(value).toString() : value.toFixed(1);

  const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / Math.max(total, 1);
    return `hsl(${hue}, 70%, 60%)`;
  };

  const selectedRecordsWithWeight = solution.selectedRecords
    .filter((sr) => sr.weight > 0)
    .map((sr) => {
      const record = records.find((r) => r.id === sr.recordId);
      const recordIndex = records.findIndex((r) => r.id === sr.recordId);
      return { ...sr, record, recordIndex };
    })
    .filter((sr) => sr.record !== undefined) as Array<{
    recordId: string;
    weight: number;
    record: Record;
    recordIndex: number;
  }>;

  const pieChartData = selectedRecordsWithWeight.map((sr, index) => ({
    id: sr.recordId,
    label: `#${sr.recordIndex + 1} ${
      sr.record.attributes.join(" + ") || "No attributes"
    }`,
    value: sr.weight,
    color: generateColor(index, selectedRecordsWithWeight.length),
  }));

  const content = (
    <>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Best match</h2>
      </div>

      {/* Collapsible Total Value & Requirement Breakdown */}
      {solution.minimumRequirements.length > 0 ||
      (solution.maximumRequirements &&
        solution.maximumRequirements.length > 0) ? (
        <div className="rounded-md border border-foreground bg-background shadow-[2px_2px_0_0_var(--color-foreground)] overflow-hidden">
          {/* Total Value Header (Clickable) */}
          <button
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
            className="w-full p-4 bg-background hover:bg-background/95 transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-left flex-1">
                <div className="text-sm text-muted-foreground mb-1">Total</div>
                <div className="text-3xl font-bold text-primary">
                  {formatValue(solution.totalValue)} /{" "}
                  {formatValue(targetValue)} {unit}
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-primary transition-transform ${
                  isBreakdownExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (solution.totalValue / targetValue) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </button>

          {/* Expanded Requirement Breakdown */}
          {isBreakdownExpanded && (
            <div className="p-4 border-t border-border">
              {/* Minimum Requirements Progress */}
              {solution.minimumRequirements.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                    Minimums
                  </h4>
                  <div className="space-y-3">
                    {solution.minimumRequirements.map((req, idx) => {
                      const progress = Math.min(
                        (req.achieved / req.target) * 100,
                        100
                      );
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground font-medium">
                              {req.attributes.join(" + ")}
                            </span>
                            <span className="text-muted-foreground">
                              {formatValue(req.achieved)} /{" "}
                              {formatValue(req.target)}
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Maximum Requirements Usage */}
              {solution.maximumRequirements &&
                solution.maximumRequirements.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
                      Maximums
                    </h4>
                    <div className="space-y-3">
                      {solution.maximumRequirements.map((req, idx) => {
                        const utilization = Math.min(
                          (req.used / req.target) * 100,
                          100
                        );
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-foreground font-medium">
                                {req.attributes.join(" + ")}
                              </span>
                              <span className="text-muted-foreground">
                                {formatValue(req.used)} /{" "}
                                {formatValue(req.target)}
                              </span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  utilization > 95
                                    ? "bg-destructive"
                                    : "bg-yellow-500"
                                }`}
                                style={{ width: `${utilization}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      ) : (
        /* Non-collapsible Total Value when no requirements */
        <div className="p-4 rounded-md border border-foreground bg-background shadow-[2px_2px_0_0_var(--color-foreground)]">
          <div className="text-sm text-muted-foreground mb-1">Total</div>
          <div className="text-3xl font-bold text-primary mb-2">
            {formatValue(solution.totalValue)} / {formatValue(targetValue)}{" "}
            {unit}
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${Math.min(
                  (solution.totalValue / targetValue) * 100,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Divider before records */}
      <div className="border-t border-border" />

      {/* Records Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Selected Records
        </h3>

        {selectedRecordsWithWeight.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pie Chart */}
            <div>
              <PieChart
                data={pieChartData}
                hoveredRecordId={hoveredRecordId ?? null}
                onHoverRecord={onHoverRecord ?? (() => {})}
              />
            </div>

            {/* Records List */}
            <div className="space-y-2">
              {selectedRecordsWithWeight.map((sr) => {
                const recordIndex = sr.recordIndex;
                const colorIndex = selectedRecordsWithWeight.findIndex(
                  (item) => item.recordId === sr.recordId
                );
                const color = generateColor(
                  colorIndex,
                  selectedRecordsWithWeight.length
                );

                return (
                  <div
                    key={sr.recordId}
                    className={`p-3 rounded-md flex items-center gap-3 transition-colors cursor-pointer border-2 ${
                      hoveredRecordId === sr.recordId
                        ? "border-primary bg-accent/20"
                        : "bg-card border-border hover:bg-accent/10"
                    }`}
                    onMouseEnter={() => onHoverRecord?.(sr.recordId)}
                    onMouseLeave={() => onHoverRecord?.(null)}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-none"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">
                        #{recordIndex + 1}{" "}
                        {sr.record.attributes.join(" + ") || "No attributes"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatValue(sr.weight)} /{" "}
                        {formatValue(sr.record.value)} {unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No records selected
          </div>
        )}
      </div>
    </>
  );

  return showCard ? (
    <Card className="p-6 space-y-6">{content}</Card>
  ) : (
    <div className="p-6 space-y-6">{content}</div>
  );
}
