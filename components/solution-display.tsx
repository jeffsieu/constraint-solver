"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { PieChart } from "@/components/pie-chart";
import { Progress } from "@/components/ui/progress";
import {
  generateRecordColor,
  cn,
  formatAttributesByGroup,
  sortAttributesByGroup,
  createAttributeOrdering,
} from "@/lib/utils";
import type { Solution, Record, AttributeGroup } from "@/lib/types";
import { useHoveredEntity } from "@/hooks/use-hovered-entity";

interface SolutionDisplayProps {
  solution: Solution;
  records: Record[];
  unit: "hours" | "occurrences";
  targetValue: number;
  attributeGroups: AttributeGroup[];
  showCard?: boolean;
}

type SelectedRecordWithMeta = {
  recordId: string;
  weight: number;
  record: Record;
  recordIndex: number;
  combinationKey: string;
};

export function SolutionDisplay({
  solution,
  records,
  unit,
  targetValue,
  attributeGroups,
  showCard = true,
}: SolutionDisplayProps) {
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
  const { hoveredEntity, setHoveredEntity } = useHoveredEntity();

  const attributeOrdering = useMemo(
    () => createAttributeOrdering(attributeGroups),
    [attributeGroups]
  );

  const getCombinationSortKey = useCallback(
    (sortedAttributes: string[]) => {
      if (sortedAttributes.length === 0) {
        return "zzzz";
      }

      const padRank = (rank: number) => rank.toString().padStart(4, "0");
      const { groupOrder, attributeOrderWithinGroup } = attributeOrdering;

      return sortedAttributes
        .map((attribute) => {
          const groupRank = groupOrder.get(attribute);
          const attributeRank = attributeOrderWithinGroup.get(attribute);
          const groupPart =
            groupRank !== undefined ? padRank(groupRank) : "9999";
          const attributePart =
            attributeRank !== undefined ? padRank(attributeRank) : "9999";
          return `${groupPart}-${attributePart}-${attribute.toLowerCase()}`;
        })
        .join("|");
    },
    [attributeOrdering]
  );

  const recordCombinationMeta = useMemo(() => {
    const meta = new Map<
      string,
      { label: string; attributes: string[]; sortKey: string }
    >();
    records.forEach((record) => {
      const sortedAttributes = sortAttributesByGroup(
        record.attributes,
        attributeGroups,
        attributeOrdering
      );
      const label =
        sortedAttributes.length > 0
          ? sortedAttributes.join(" + ")
          : "No attributes";
      const sortKey = getCombinationSortKey(sortedAttributes);

      meta.set(record.id, { label, attributes: sortedAttributes, sortKey });
    });

    return meta;
  }, [records, attributeGroups, attributeOrdering, getCombinationSortKey]);

  const hoveredRecordId =
    hoveredEntity?.type === "record" ? hoveredEntity.recordId : null;
  const hoveredCombination =
    hoveredEntity?.type === "combination"
      ? hoveredEntity.combination
      : hoveredEntity?.type === "record"
      ? recordCombinationMeta.get(hoveredEntity.recordId)?.label ?? null
      : null;

  const formatValue = (value: number) =>
    unit === "occurrences" ? Math.round(value).toString() : value.toFixed(1);

  const recordMetaMap = new Map<string, { record: Record; index: number }>();
  records.forEach((record, index) => {
    recordMetaMap.set(record.id, { record, index });
  });

  const selectedRecordsWithWeight: SelectedRecordWithMeta[] =
    solution.selectedRecords
      .filter((sr) => sr.weight > 0)
      .map((sr) => {
        const meta = recordMetaMap.get(sr.recordId);
        if (!meta) return null;
        const combinationMeta = recordCombinationMeta.get(sr.recordId);
        return {
          recordId: sr.recordId,
          weight: sr.weight,
          record: meta.record,
          recordIndex: meta.index,
          combinationKey:
            combinationMeta?.label ??
            formatAttributesByGroup(meta.record.attributes, attributeGroups),
        };
      })
      .filter((sr): sr is SelectedRecordWithMeta => sr !== null);

  const pieChartData = selectedRecordsWithWeight.map((sr) => ({
    id: sr.recordId,
    label: `#${sr.recordIndex + 1} ${sr.combinationKey}`,
    value: sr.weight,
    color: generateRecordColor(sr.recordId),
    combinationKey: sr.combinationKey,
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
                className={cn(
                  "w-6 h-6 text-primary transition-transform",
                  isBreakdownExpanded ? "rotate-180" : ""
                )}
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
                                className={cn(
                                  "h-full transition-all duration-300",
                                  utilization > 95
                                    ? "bg-destructive"
                                    : "bg-yellow-500"
                                )}
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

      {/* Record Breakdown - Combination Totals */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          Record usage
        </h3>
        {records.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              // Calculate totals for each unique attribute combination from ALL records
              const combinationTotals = new Map<
                string,
                { total: number; sortKey: string }
              >();

              records.forEach((record) => {
                const combinationMeta = recordCombinationMeta.get(record.id);
                const fallbackSortedAttributes = combinationMeta
                  ? combinationMeta.attributes
                  : sortAttributesByGroup(
                      record.attributes,
                      attributeGroups,
                      attributeOrdering
                    );
                const combinationKey =
                  combinationMeta?.label ??
                  (fallbackSortedAttributes.length > 0
                    ? fallbackSortedAttributes.join(" + ")
                    : "No attributes");
                const sortKey =
                  combinationMeta?.sortKey ??
                  getCombinationSortKey(fallbackSortedAttributes);

                const existing = combinationTotals.get(combinationKey);
                if (existing) {
                  existing.total += record.value;
                } else {
                  combinationTotals.set(combinationKey, {
                    total: record.value,
                    sortKey,
                  });
                }
              });

              // Calculate used amounts for each combination from selected records
              const combinationUsed = new Map<string, number>();

              selectedRecordsWithWeight.forEach((sr) => {
                const combinationKey = sr.combinationKey;
                const currentUsed = combinationUsed.get(combinationKey) || 0;
                combinationUsed.set(combinationKey, currentUsed + sr.weight);
              });

              // Convert to array and sort by total (descending)
              const sortedCombinations = Array.from(
                combinationTotals.entries()
              ).sort((a, b) => {
                const sortKeyA = a[1].sortKey;
                const sortKeyB = b[1].sortKey;
                const comparison = sortKeyA.localeCompare(sortKeyB);
                if (comparison !== 0) {
                  return comparison;
                }
                return a[0].localeCompare(b[0]);
              });

              return sortedCombinations.map(([combination, meta]) => {
                const used = combinationUsed.get(combination) || 0;
                const percentage =
                  meta.total > 0 ? (used / meta.total) * 100 : 0;
                const isCombinationActive = hoveredCombination === combination;

                return (
                  <div
                    key={combination}
                    className={cn(
                      "p-3 rounded-md border space-y-2 transition-colors",
                      isCombinationActive
                        ? "border-primary bg-accent/20"
                        : "bg-card border-border hover:bg-accent/10"
                    )}
                    onMouseEnter={() =>
                      setHoveredEntity({
                        type: "combination",
                        combination,
                      })
                    }
                    onMouseLeave={() =>
                      setHoveredEntity((current) =>
                        current?.type === "combination" &&
                        current.combination === combination
                          ? null
                          : current
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {combination}
                      </span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatValue(used)} / {formatValue(meta.total)} {unit}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No records available
          </div>
        )}
      </div>

      {/* Divider */}
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
              <PieChart data={pieChartData} />
            </div>

            {/* Records List */}
            <div className="space-y-2">
              {selectedRecordsWithWeight.map((sr) => {
                const recordIndex = sr.recordIndex;
                const color = generateRecordColor(sr.recordId);
                const isRecordHovered = hoveredRecordId === sr.recordId;
                const isCombinationHovered =
                  hoveredCombination === sr.combinationKey && !isRecordHovered;

                return (
                  <div
                    key={sr.recordId}
                    className={cn(
                      "p-3 rounded-md flex items-center gap-3 transition-colors cursor-pointer border-2",
                      isRecordHovered
                        ? "border-primary bg-accent/20"
                        : isCombinationHovered
                        ? "border-primary/70 bg-accent/10"
                        : "bg-card border-border hover:bg-accent/10"
                    )}
                    onMouseEnter={() =>
                      setHoveredEntity({
                        type: "record",
                        recordId: sr.recordId,
                      })
                    }
                    onMouseLeave={() =>
                      setHoveredEntity((current) =>
                        current?.type === "record" &&
                        current.recordId === sr.recordId
                          ? null
                          : current
                      )
                    }
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-none"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-foreground">
                          #{recordIndex + 1} {sr.combinationKey}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatValue(sr.weight)} /{" "}
                          {formatValue(sr.record.value)} {unit}
                        </div>
                      </div>
                      <Progress
                        value={(sr.weight / sr.record.value) * 100}
                        className="h-2"
                      />
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
    <div className="p-4 space-y-6">{content}</div>
  );
}
