"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useHoveredEntity } from "@/hooks/use-hovered-entity";

interface PieChartProps {
  data: {
    id: string;
    label: string;
    value: number;
    color: string;
    combinationKey: string;
  }[];
}

export function PieChart({ data }: PieChartProps) {
  const { hoveredEntity, setHoveredEntity } = useHoveredEntity();
  const combinationByRecordId = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((item) => {
      map.set(item.id, item.combinationKey);
    });
    return map;
  }, [data]);

  const hoveredRecordId =
    hoveredEntity?.type === "record" ? hoveredEntity.recordId : null;
  const hoveredCombination =
    hoveredEntity?.type === "combination"
      ? hoveredEntity.combination
      : hoveredEntity?.type === "record"
      ? combinationByRecordId.get(hoveredEntity.recordId) ?? null
      : null;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data to display
      </div>
    );
  }

  let currentAngle = -90; // Start from top
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    let pathData;

    // Special case: if this is a full circle (or very close to it), draw a circle using two semicircles
    if (angle >= 359.99) {
      const midAngle = startAngle + 180;
      const midRad = (midAngle * Math.PI) / 180;
      const startRad = (startAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const xMid = centerX + radius * Math.cos(midRad);
      const yMid = centerY + radius * Math.sin(midRad);

      pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 0 1 ${xMid} ${yMid}`,
        `A ${radius} ${radius} 0 0 1 ${x1} ${y1}`,
        "Z",
      ].join(" ");
    } else {
      // Calculate path for partial slice
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        "Z",
      ].join(" ");
    }

    currentAngle = endAngle;

    return {
      ...item,
      pathData,
      percentage,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 200"
        className="w-full max-w-xs"
        style={{ maxHeight: "300px" }}
      >
        {slices.map((slice) => {
          const hasRecordHover = hoveredRecordId !== null;
          const hasCombinationHover =
            hoveredCombination !== null && !hasRecordHover;
          const isRecordMatch = hoveredRecordId === slice.id;
          const isCombinationMatch =
            hoveredCombination === slice.combinationKey;
          const shouldDim = hasRecordHover
            ? !isRecordMatch
            : hasCombinationHover
            ? !isCombinationMatch
            : false;
          const activeClass = isRecordMatch
            ? "opacity-100 scale-105"
            : isCombinationMatch && !hasRecordHover
            ? "opacity-100"
            : "opacity-90 hover:opacity-100";
          const baseClass = shouldDim ? "opacity-40" : activeClass;

          // Special case: if this is a full circle, draw it as a circle element
          if (slice.percentage >= 99.99) {
            return (
              <g key={slice.id}>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={radius}
                  fill={slice.color}
                  stroke="var(--color-foreground)"
                  strokeWidth="1"
                  className={cn("transition-all cursor-pointer", baseClass)}
                  style={{
                    transformOrigin: `${centerX}px ${centerY}px`,
                  }}
                  onMouseEnter={() =>
                    setHoveredEntity({
                      type: "record",
                      recordId: slice.id,
                    })
                  }
                  onMouseLeave={() =>
                    setHoveredEntity((current) =>
                      current?.type === "record" &&
                      current.recordId === slice.id
                        ? null
                        : current
                    )
                  }
                />
              </g>
            );
          }

          // Normal case: draw a path for partial slice
          return (
            <g key={slice.id}>
              <path
                d={slice.pathData}
                fill={slice.color}
                stroke="var(--color-foreground)"
                strokeWidth="1"
                className={cn("transition-all cursor-pointer", baseClass)}
                style={{
                  transformOrigin: `${centerX}px ${centerY}px`,
                }}
                onMouseEnter={() =>
                  setHoveredEntity({
                    type: "record",
                    recordId: slice.id,
                  })
                }
                onMouseLeave={() =>
                  setHoveredEntity((current) =>
                    current?.type === "record" && current.recordId === slice.id
                      ? null
                      : current
                  )
                }
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-4 space-y-2 w-full">
        {slices.map((slice) => {
          const hasRecordHover = hoveredRecordId !== null;
          const hasCombinationHover =
            hoveredCombination !== null && !hasRecordHover;
          const isRecordMatch = hoveredRecordId === slice.id;
          const isCombinationMatch =
            hoveredCombination === slice.combinationKey;
          const shouldDim = hasRecordHover
            ? !isRecordMatch
            : hasCombinationHover
            ? !isCombinationMatch
            : false;

          return (
            <div
              key={slice.id}
              className={cn(
                "flex items-center gap-2 text-sm transition-opacity cursor-pointer",
                shouldDim ? "opacity-40" : "opacity-100",
                isRecordMatch ? "font-semibold" : undefined,
                isCombinationMatch && !hasRecordHover
                  ? "font-semibold"
                  : undefined
              )}
              onMouseEnter={() =>
                setHoveredEntity({
                  type: "record",
                  recordId: slice.id,
                })
              }
              onMouseLeave={() =>
                setHoveredEntity((current) =>
                  current?.type === "record" && current.recordId === slice.id
                    ? null
                    : current
                )
              }
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <div className="flex-1">{slice.label}</div>
              <div className="text-muted-foreground">
                {slice.percentage.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
