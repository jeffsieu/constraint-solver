"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AttributeGroupsInput } from "@/components/attribute-groups-input"
import { RecordInput } from "@/components/record-input"
import { RequirementsTree } from "@/components/requirements-tree"
import { SolutionDisplay } from "@/components/solution-display"
import { solveProblem } from "@/lib/solver"
import type { Record, Requirement, Solution, AttributeGroup } from "@/lib/types"

export default function Home() {
  const [globalUnit, setGlobalUnit] = useState<"hours" | "occurrences">("hours")
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([
    { id: "1", name: "Day/Night", attributes: ["Day", "Night"] },
  ])
  const [targetValue, setTargetValue] = useState<number>(10)
  const [records, setRecords] = useState<Record[]>([
    { id: "1", value: 3, attributes: ["Day"] },
    { id: "2", value: 4, attributes: ["Night"] },
  ])
  const [requirements, setRequirements] = useState<Requirement>({
    id: "root",
    type: "complex",
    operator: "AND",
    children: [
      {
        id: "req1",
        type: "simple",
        constraint: "maximum",
        value: 5,
        attributes: ["Day"],
      },
    ],
  })
  const [solution, setSolution] = useState<Solution | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSolve = () => {
    try {
      setError(null)
      const result = solveProblem(records, requirements, targetValue, globalUnit)
      setSolution(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setSolution(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Constraint Satisfaction Solver</h1>
          <p className="text-muted-foreground text-lg">Optimize resource allocation using linear programming</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Attribute Groups</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Define mutually exclusive attribute groups. Each record can have at most one attribute from each group.
              </p>
              <AttributeGroupsInput attributeGroups={attributeGroups} setAttributeGroups={setAttributeGroups} />
            </Card>

            {/* Target Value */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Target Value</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="unit">Unit Type (applies to all records)</Label>
                  <select
                    id="unit"
                    value={globalUnit}
                    onChange={(e) => setGlobalUnit(e.target.value as "hours" | "occurrences")}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="hours">Hours</option>
                    <option value="occurrences">Occurrences</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="target">Target Amount</Label>
                  <Input
                    id="target"
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    min={0}
                    step={0.1}
                  />
                </div>
              </div>
            </Card>

            {/* Records */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Records</h2>
              <RecordInput records={records} setRecords={setRecords} attributeGroups={attributeGroups} />
            </Card>

            {/* Requirements */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Requirements Tree</h2>
              <RequirementsTree requirement={requirements} setRequirement={setRequirements} />
            </Card>

            <Button onClick={handleSolve} size="lg" className="w-full">
              Solve Problem
            </Button>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Solution Section */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            {solution ? (
              <SolutionDisplay solution={solution} records={records} unit={globalUnit} />
            ) : (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">
                  <svg
                    className="mx-auto h-16 w-16 mb-4 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg font-medium">No solution yet</p>
                  <p className="text-sm mt-2">Configure your problem and click "Solve Problem" to see results</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
