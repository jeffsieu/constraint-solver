"use client"

import { Card } from "@/components/ui/card"
import type { Solution, Record } from "@/lib/types"

interface SolutionDisplayProps {
  solution: Solution
  records: Record[]
  unit: "hours" | "occurrences"
}

export function SolutionDisplay({ solution, records, unit }: SolutionDisplayProps) {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Solution Found</h2>
        <p className="text-muted-foreground">Optimization completed successfully</p>
      </div>

      {/* Total Value */}
      <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
        <div className="text-sm text-muted-foreground mb-1">Total Value</div>
        <div className="text-3xl font-bold text-primary">{solution.totalValue.toFixed(2)}</div>
      </div>

      {/* Minimum Requirements Progress */}
      {solution.minimumRequirements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">Minimum Requirements</h3>
          <div className="space-y-3">
            {solution.minimumRequirements.map((req, idx) => {
              const progress = Math.min((req.achieved / req.target) * 100, 100)
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">
                      {req.attributes.join(" + ")} (Min: {req.target})
                    </span>
                    <span className="text-muted-foreground">
                      {req.achieved.toFixed(2)} / {req.target}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Records Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">Records Selected</h3>
        <div className="space-y-2">
          {solution.selectedRecords
            .filter((sr) => sr.weight > 0)
            .map((sr) => {
              const record = records.find((r) => r.id === sr.recordId)
              if (!record) return null
              return (
                <div key={sr.recordId} className="p-3 bg-accent rounded-md flex justify-between items-center">
                  <div>
                    <div className="font-medium text-foreground">
                      {record.attributes.join(" + ") || "No attributes"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.value} {unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{sr.weight.toFixed(2)}x</div>
                    <div className="text-sm text-muted-foreground">= {(record.value * sr.weight).toFixed(2)}</div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {solution.selectedRecords.filter((sr) => sr.weight > 0).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No records selected in the optimal solution</div>
      )}
    </Card>
  )
}
