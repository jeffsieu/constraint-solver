"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AttributeGroupsInput } from "@/components/attribute-groups-input";
import { RecordInput } from "@/components/record-input";
import { RequirementsTree } from "@/components/requirements-tree";
import { SolutionDisplay } from "@/components/solution-display";
import { solveProblem } from "@/lib/solver";
import type {
  Record,
  Requirement,
  Solution,
  AttributeGroup,
} from "@/lib/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { testScenarios } from "@/lib/test-scenarios";

type SolverForm = {
  globalUnit: "hours" | "occurrences";
  attributeGroups: AttributeGroup[];
  targetValue: number;
  records: Record[];
  requirements: Requirement;
};

export default function Home() {
  const defaults: SolverForm = {
    globalUnit: "hours",
    attributeGroups: [
      { id: "1", name: "Day/Night", attributes: ["Day", "Night"] },
    ],
    targetValue: 10,
    records: [
      { id: "1", value: 3, attributes: ["Day"] },
      { id: "2", value: 4, attributes: ["Night"] },
    ],
    requirements: {
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
    },
  };

  // Helper function to render requirement tree preview
  const renderRequirementPreview = (req: Requirement): React.ReactNode => {
    if (req.type === "simple") {
      return (
        <div className="text-muted-foreground py-1">
          <span className="font-medium text-foreground capitalize">
            {req.constraint}
          </span>{" "}
          {req.value} × [{req.attributes.join(", ")}]
        </div>
      );
    } else {
      return (
        <div className="flex gap-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider writing-mode-vertical flex items-center">
            <span className="rotate-180" style={{ writingMode: "vertical-rl" }}>
              {req.operator}
            </span>
          </div>
          <div className="flex-1 border-l-2 border-border pl-4 space-y-1">
            {req.children.map((child) => (
              <div key={child.id}>{renderRequirementPreview(child)}</div>
            ))}
          </div>
        </div>
      );
    }
  };

  const [persisted, setPersisted, formReady] = useLocalStorage<SolverForm>(
    "solverForm",
    defaults
  );
  const methods = useForm<SolverForm>({ defaultValues: persisted });

  const globalUnit = methods.watch("globalUnit");
  const attributeGroups = methods.watch("attributeGroups");
  const targetValue = methods.watch("targetValue");
  const records = methods.watch("records");
  const requirements = methods.watch("requirements");

  const [solution, setSolution, solutionReady] =
    useLocalStorage<Solution | null>("solverSolution", null);
  const [error, setError, errorReady] = useLocalStorage<string | null>(
    "solverError",
    null
  );
  const [isSpecExpanded, setIsSpecExpanded, specExpandedReady] =
    useLocalStorage<boolean>("solverSpecExpanded", true);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);

  // Reset form when localStorage data hydrates (only once when ready)
  useEffect(() => {
    if (formReady) {
      methods.reset(persisted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formReady]);

  // Persist form changes to localStorage
  useEffect(() => {
    const sub = methods.watch((vals) => setPersisted(vals as SolverForm));
    return () => sub.unsubscribe();
  }, [methods, setPersisted]);

  // Auto-calculate solution when form values change
  useEffect(() => {
    if (!formReady) return; // Wait until localStorage hydrated

    try {
      setError(null);
      const v = methods.getValues();
      const result = solveProblem(
        v.records,
        v.requirements,
        v.targetValue,
        v.globalUnit,
        v.attributeGroups
      );
      setSolution(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setSolution(null);
    }
  }, [
    formReady,
    records,
    requirements,
    targetValue,
    globalUnit,
    attributeGroups,
    methods,
    setError,
    setSolution,
  ]);

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Constraint Satisfaction Solver
            </h1>
            <p className="text-muted-foreground text-lg">
              Optimize resource allocation using linear programming
            </p>
          </div>

          {/* Combined Configuration Card - Full Width */}
          <Card className="p-6 mb-6">
            {/* Collapsible Header */}
            <button
              onClick={() => setIsSpecExpanded(!isSpecExpanded)}
              className="w-full flex items-center justify-between mb-4 hover:opacity-70 transition-opacity"
            >
              <h2 className="text-2xl font-bold text-foreground">
                Problem Specification
              </h2>
              <svg
                className={`w-6 h-6 transition-transform ${
                  isSpecExpanded ? "rotate-180" : ""
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
            </button>

            {/* Compact Read-Only View */}
            {!isSpecExpanded && (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Target:</span>{" "}
                    {targetValue} {globalUnit}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Attribute Groups:
                    </span>{" "}
                    {attributeGroups.map((g) => g.name).join(", ") || "None"}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    Requirements:
                  </span>
                  <div className="mt-2">
                    {renderRequirementPreview(requirements)}
                  </div>
                </div>
              </div>
            )}

            {/* Expanded Full View */}
            {isSpecExpanded && (
              <div className="space-y-8">
                {/* Target Value Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    Target Value
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="unit">
                        Unit Type (applies to all records)
                      </Label>
                      <select
                        id="unit"
                        value={globalUnit}
                        onChange={(e) =>
                          methods.setValue(
                            "globalUnit",
                            e.target.value as "hours" | "occurrences"
                          )
                        }
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
                        onChange={(e) =>
                          methods.setValue(
                            "targetValue",
                            Number(e.target.value)
                          )
                        }
                        min={0}
                        step={0.1}
                      />
                    </div>
                  </div>
                </div>

                {/* Attribute Groups Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    Attribute Groups
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Define mutually exclusive attribute groups. Each record can
                    have at most one attribute from each group.
                  </p>
                  <AttributeGroupsInput
                    attributeGroups={attributeGroups}
                    setAttributeGroups={(g) =>
                      methods.setValue("attributeGroups", g)
                    }
                  />
                </div>

                {/* Requirements Tree Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    Requirements Tree
                  </h2>
                  <RequirementsTree
                    requirement={requirements}
                    setRequirement={(r) => methods.setValue("requirements", r)}
                  />
                </div>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Records */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    Records
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {testScenarios.map((scenario, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          methods.setValue("records", scenario.records);
                        }}
                      >
                        {scenario.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <RecordInput
                  records={records}
                  setRecords={(r) => methods.setValue("records", r)}
                  attributeGroups={attributeGroups}
                  hoveredRecordId={hoveredRecordId}
                  onHoverRecord={setHoveredRecordId}
                />
              </Card>
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              )}
            </div>
            {/* Right: Solution */}
            <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
              {errorReady && error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              )}
              {solutionReady && solution ? (
                <SolutionDisplay
                  solution={solution}
                  records={records}
                  unit={globalUnit}
                  targetValue={targetValue}
                  hoveredRecordId={hoveredRecordId}
                  onHoverRecord={setHoveredRecordId}
                />
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
                    <p className="text-sm mt-2">
                      Configure your problem and click "Solve Problem" to see
                      results
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
