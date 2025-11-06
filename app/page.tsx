"use client";

import { Suspense, useEffect, useState } from "react";
import { FormProvider } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AttributeGroupsInput } from "@/components/attribute-groups-input";
import { RecordInput } from "@/components/record-input";
import { RequirementsTree } from "@/components/requirements-tree";
import { SolutionDisplay } from "@/components/solution-display";
import { CopyLink } from "@/components/copy-link";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useIsMobile } from "@/components/ui/use-mobile";
import { solveProblem } from "@/lib/solver";
import { ChevronUp } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import type {
  Record,
  Requirement,
  Solution,
  AttributeGroup,
} from "@/lib/types";
import { useQueryParamsPersistedForm } from "@/hooks/use-query-params-persisted-form";
import { solverFormSchema } from "@/lib/form-schema";

type SolverForm = {
  globalUnit: "hours" | "occurrences";
  attributeGroups: AttributeGroup[];
  targetValue: number;
  records: Record[];
  requirements: Requirement;
};

function HomeContent() {
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

  const methods = useQueryParamsPersistedForm({
    schema: solverFormSchema,
    defaultValues: defaults,
  });

  const globalUnit = methods.watch("globalUnit");
  const attributeGroups = methods.watch("attributeGroups");
  const targetValue = methods.watch("targetValue");
  const records = methods.watch("records");
  const requirements = methods.watch("requirements");

  const [solution, setSolution] = useState<Solution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpecExpanded, setIsSpecExpanded] = useState(true);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);
  const [showStickySpec, setShowStickySpec] = useState(false);

  const isMobile = useIsMobile();

  // Track scroll position to show/hide sticky spec on mobile
  useEffect(() => {
    const handleScroll = () => {
      const specCard = document.getElementById("spec-card");
      if (specCard) {
        const rect = specCard.getBoundingClientRect();
        const cardHeight = rect.height;

        // Only show when card is scrolled up past the viewport
        if (rect.top < 0) {
          // Card has started scrolling out of view at the top
          const scrolledOutAmount = Math.abs(rect.top);
          const scrolledOutPercentage = (scrolledOutAmount / cardHeight) * 100;
          setShowStickySpec(scrolledOutPercentage > 50);
        } else {
          // Card is still fully visible or below viewport
          setShowStickySpec(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Maintain record integrity: remove invalid attributes when attribute groups change
  useEffect(() => {
    const allValidAttributes = new Set(
      attributeGroups.flatMap((group) => group.attributes)
    );

    // Clean records
    const cleanedRecords = records.map((record) => ({
      ...record,
      attributes: record.attributes.filter((attr) =>
        allValidAttributes.has(attr)
      ),
    }));

    // Clean requirements recursively
    const cleanRequirement = (req: Requirement): Requirement => {
      if (req.type === "simple") {
        return {
          ...req,
          attributes: req.attributes.filter((attr) =>
            allValidAttributes.has(attr)
          ),
        };
      } else {
        return {
          ...req,
          children: req.children.map(cleanRequirement),
        };
      }
    };

    const cleanedRequirements = cleanRequirement(requirements);

    // Only update if there are actual changes to avoid infinite loops
    const recordsHaveChanges = cleanedRecords.some((cleanedRecord, index) => {
      const originalRecord = records[index];
      return (
        cleanedRecord.attributes.length !== originalRecord.attributes.length ||
        cleanedRecord.attributes.some(
          (attr, i) => attr !== originalRecord.attributes[i]
        )
      );
    });

    const requirementsHaveChanges = JSON.stringify(cleanedRequirements) !== JSON.stringify(requirements);

    if (recordsHaveChanges) {
      methods.setValue("records", cleanedRecords);
    }

    if (requirementsHaveChanges) {
      methods.setValue("requirements", cleanedRequirements);
    }
  }, [attributeGroups, records, requirements, methods]);

  // Auto-calculate solution when form values change
  useEffect(() => {
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
    records,
    requirements,
    targetValue,
    globalUnit,
    attributeGroups,
    methods,
  ]);

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-background">
        {/* Sticky spec bar - mobile only, shows when spec card is out of view */}
        <div
          className={`md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border shadow-md transition-transform duration-300 ${
            showStickySpec ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setIsSpecExpanded(true);
            }}
            className="w-full p-3 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Target:</span>{" "}
                  {targetValue} {globalUnit}
                </div>
                <div>
                  <span className="font-medium text-foreground">Groups:</span>{" "}
                  {attributeGroups.map((g) => g.name).join(", ") || "None"}
                </div>
              </div>
              <div className="text-xs">
                <span className="font-medium text-foreground">
                  Requirements:
                </span>
                <div className="mt-1 text-muted-foreground">
                  {renderRequirementPreview(requirements)}
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-7xl pb-24 md:pb-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Constraint Satisfaction Solver
            </h1>
            <p className="text-muted-foreground text-lg">
              Optimize resource allocation using linear programming
            </p>
          </div>

          {/* Combined Configuration Card - Full Width */}
          <div className={isMobile ? "mb-6" : ""} id="spec-card">
            <div className={isMobile ? "" : ""}>
              {!isMobile && (
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
                          <span className="font-medium text-foreground">
                            Target:
                          </span>{" "}
                          {targetValue} {globalUnit}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Attribute Groups:
                          </span>{" "}
                          {attributeGroups.map((g) => g.name).join(", ") ||
                            "None"}
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
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="unit">
                                Unit Type (applies to all records)
                              </Label>
                              <Select
                                value={globalUnit}
                                onValueChange={(val) =>
                                  methods.setValue(
                                    "globalUnit",
                                    val as "hours" | "occurrences"
                                  )
                                }
                              >
                                <SelectTrigger
                                  className="w-full rounded-md"
                                  id="unit"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hours">Hours</SelectItem>
                                  <SelectItem value="occurrences">
                                    Occurrences
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                      </div>

                      {/* Attribute Groups Section */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                          Attribute Groups
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define mutually exclusive attribute groups. Each
                          record can have at most one attribute from each group.
                        </p>
                        <AttributeGroupsInput
                          attributeGroups={attributeGroups}
                          setAttributeGroups={(g) =>
                            methods.setValue("attributeGroups", g)
                          }
                        />
                        {/* Requirements Tree - placed below Attribute Groups */}
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-3 text-foreground">
                            Requirements
                          </h3>
                          <RequirementsTree
                            requirement={requirements}
                            setRequirement={(r) =>
                              methods.setValue("requirements", r)
                            }
                            attributeGroups={attributeGroups}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {isMobile && (
                <>
                  {/* Mobile: No card wrapper */}
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
                    <div className="space-y-3 text-sm p-4 rounded-md border-2 border-border bg-card">
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">
                            Target:
                          </span>{" "}
                          {targetValue} {globalUnit}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Attribute Groups:
                          </span>{" "}
                          {attributeGroups.map((g) => g.name).join(", ") ||
                            "None"}
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
                        <div className="p-4 rounded-lg border bg-card">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="unit">
                                Unit Type (applies to all records)
                              </Label>
                              <Select
                                value={globalUnit}
                                onValueChange={(val) =>
                                  methods.setValue(
                                    "globalUnit",
                                    val as "hours" | "occurrences"
                                  )
                                }
                              >
                                <SelectTrigger
                                  className="w-full rounded-md"
                                  id="unit"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hours">Hours</SelectItem>
                                  <SelectItem value="occurrences">
                                    Occurrences
                                  </SelectItem>
                                </SelectContent>
                              </Select>
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
                      </div>

                      {/* Attribute Groups Section */}
                      <div>
                        <h2 className="text-xl font-semibold mb-4 text-foreground">
                          Attribute Groups
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define mutually exclusive attribute groups. Each
                          record can have at most one attribute from each group.
                        </p>
                        <AttributeGroupsInput
                          attributeGroups={attributeGroups}
                          setAttributeGroups={(g) =>
                            methods.setValue("attributeGroups", g)
                          }
                        />
                        {/* Requirements Tree - placed below Attribute Groups */}
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-3 text-foreground">
                            Requirements
                          </h3>
                          <RequirementsTree
                            requirement={requirements}
                            setRequirement={(r) =>
                              methods.setValue("requirements", r)
                            }
                            attributeGroups={attributeGroups}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Divider between spec and records on mobile */}
          {isMobile && <div className="border-t border-border my-6" />}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Records */}
            <div className="space-y-6">
              {!isMobile && (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    Records
                  </h2>
                  <RecordInput
                    records={records}
                    setRecords={(r) => methods.setValue("records", r)}
                    attributeGroups={attributeGroups}
                    hoveredRecordId={hoveredRecordId}
                    onHoverRecord={setHoveredRecordId}
                  />
                </Card>
              )}

              {isMobile && (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    Records
                  </h2>
                  <RecordInput
                    records={records}
                    setRecords={(r) => methods.setValue("records", r)}
                    attributeGroups={attributeGroups}
                    hoveredRecordId={hoveredRecordId}
                    onHoverRecord={setHoveredRecordId}
                  />
                </>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              )}
            </div>
            {/* Right: Solution */}
            <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-destructive font-medium">{error}</p>
                </div>
              )}
              {/* Desktop / large screens: show Solution card */}
              <div className="hidden md:block">
                {solution ? (
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

              {/* Mobile: fixed bottom bar with summary and drawer trigger */}
              <div className="md:hidden">
                <div className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 items-end">
                  {/* Copy Link button */}
                  <CopyLink />

                  {/* Bottom bar with solution summary */}
                  <button
                    className="w-full rounded-md border-2 border-border bg-card p-3 transition-colors text-left cursor-pointer"
                    onClick={() => setIsSolutionOpen(true)}
                  >
                    {/* Summary line: show total value / target */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          Best match
                        </div>
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {solution
                          ? `${
                              globalUnit === "occurrences"
                                ? Math.round(solution.totalValue)
                                : solution.totalValue.toFixed(1)
                            } / ${
                              globalUnit === "occurrences"
                                ? Math.round(targetValue)
                                : targetValue.toFixed(1)
                            } ${globalUnit}`
                          : "No solution"}
                      </div>
                      {solution && (
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
                      )}
                    </div>
                  </button>
                </div>

                <Drawer open={isSolutionOpen} onOpenChange={setIsSolutionOpen}>
                  <DrawerContent
                    className="max-h-[90vh]"
                    data-vaul-drawer-direction="bottom"
                  >
                    <VisuallyHidden>
                      <DrawerTitle>Best match</DrawerTitle>
                      <DrawerDescription>
                        View the optimal solution that matches your requirements
                      </DrawerDescription>
                    </VisuallyHidden>
                    <div className="overflow-y-auto">
                      {solution ? (
                        <SolutionDisplay
                          solution={solution}
                          records={records}
                          unit={globalUnit}
                          targetValue={targetValue}
                          hoveredRecordId={hoveredRecordId}
                          onHoverRecord={setHoveredRecordId}
                          showCard={false}
                        />
                      ) : (
                        <div className="text-muted-foreground">
                          No solution yet
                        </div>
                      )}
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </div>
        </div>

        {/* Copy Link button - bottom-right on desktop */}
        <CopyLink className="hidden md:block fixed right-8 bottom-8 z-50" />
      </div>
    </FormProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
