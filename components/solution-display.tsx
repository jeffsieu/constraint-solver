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
}: SolutionDisplayProps) {
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // Format numbers based on unit type
  const formatValue = (value: number) => {
    return unit === "occurrences"
      ? Math.round(value).toString()
      : value.toFixed(1);
  };

  // Generate colors for pie chart
  const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Prepare pie chart data
  const selectedRecordsWithWeight = solution.selectedRecords
    .filter((sr) => sr.weight > 0)
    .map((sr) => {
      const record = records.find((r) => r.id === sr.recordId);
      const recordIndex = records.findIndex((r) => r.id === sr.recordId);
      return { ...sr, record, recordIndex };
    })
    .filter((sr) => sr.record !== undefined);

  const pieChartData = selectedRecordsWithWeight.map((sr, index) => ({
    id: sr.recordId,
    label: `#${sr.recordIndex + 1} ${
      sr.record!.attributes.join(" + ") || "No attributes"
    }`,
    value: sr.weight,
    color: generateColor(index, selectedRecordsWithWeight.length),
  }));

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Solution</h2>
      </div>

      {/* Collapsible Total Value & Requirement Breakdown */}
      {solution.minimumRequirements.length > 0 ||
      (solution.maximumRequirements &&
        solution.maximumRequirements.length > 0) ? (
        <div className="border border-primary/20 rounded-lg overflow-hidden">
          {/* Total Value Header (Clickable) */}
          <button
            onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
            className="w-full p-4 bg-primary/10 hover:bg-primary/15 transition-colors"
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
          </button>

          {/* Expanded Requirement Breakdown */}
          {isBreakdownExpanded && (
            <div className="p-4 border-t border-primary/20">
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
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
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
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
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
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
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
                const recordIndex = records.findIndex(
                  (r) => r.id === sr.recordId
                );
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
                    className={`p-3 rounded-md flex items-center gap-3 transition-all cursor-pointer ${
                      hoveredRecordId === sr.recordId
                        ? "bg-accent ring-2 ring-primary/50"
                        : "bg-accent hover:bg-accent/80"
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
                        {sr.record!.attributes.join(" + ") || "No attributes"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatValue(sr.weight)} /{" "}
                        {formatValue(sr.record!.value)} {unit}
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
    </Card>
  );
}
