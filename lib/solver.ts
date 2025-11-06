import type {
  Record as RecordType,
  Requirement,
  Solution,
  AttributeGroup,
} from "./types";
import type { Model } from "yalps";
import { solve } from "yalps";

interface ScaledProblem {
  records: RecordType[];
  requirements: Requirement;
  targetValue: number;
  scaleFactor: number;
}

function scaleProblem(
  records: RecordType[],
  requirements: Requirement,
  targetValue: number,
  scaleFactor: number
): ScaledProblem {
  // Scale all record values
  const scaledRecords = records.map((record) => ({
    ...record,
    value: Math.round(record.value * scaleFactor),
  }));

  // Scale requirement values recursively
  const scaleRequirement = (req: Requirement): Requirement => {
    if (req.type === "simple") {
      return {
        ...req,
        value: Math.round(req.value * scaleFactor),
      };
    } else {
      return {
        ...req,
        children: req.children.map(scaleRequirement),
      };
    }
  };

  const scaledRequirements = scaleRequirement(requirements);
  const scaledTargetValue = Math.round(targetValue * scaleFactor);

  return {
    records: scaledRecords,
    requirements: scaledRequirements,
    targetValue: scaledTargetValue,
    scaleFactor,
  };
}

function assertIntegerValues(
  records: RecordType[],
  requirements: Requirement,
  targetValue: number
): void {
  // Assert all record values are integers
  records.forEach((record, idx) => {
    if (!Number.isInteger(record.value)) {
      throw new Error(
        `Record ${idx} value ${record.value} is not an integer. Problem must be scaled first.`
      );
    }
  });

  // Assert all requirement values are integers recursively
  const assertRequirementInteger = (req: Requirement, path: string) => {
    if (req.type === "simple") {
      if (!Number.isInteger(req.value)) {
        throw new Error(
          `Requirement ${path} value ${req.value} is not an integer. Problem must be scaled first.`
        );
      }
    } else {
      req.children.forEach((child, idx) => {
        assertRequirementInteger(child, `${path}.children[${idx}]`);
      });
    }
  };

  assertRequirementInteger(requirements, "requirements");

  // Assert target value is integer
  if (!Number.isInteger(targetValue)) {
    throw new Error(
      `Target value ${targetValue} is not an integer. Problem must be scaled first.`
    );
  }
}

function solveProblemScaled(
  records: RecordType[],
  requirements: Requirement,
  targetValue: number,
  attributeGroups: AttributeGroup[]
): Solution {
  // Assert that all values are integers (i.e., problem has been scaled)
  assertIntegerValues(records, requirements, targetValue);

  // Build the LP model for YALPS
  const constraints: {
    [key: string]: { [key: string]: number | undefined } & {
      min?: number;
      max?: number;
    };
  } = {};
  const variables: { [key: string]: { [key: string]: number } } = {};
  const integers: string[] = [];

  const minimumRequirements: Array<{
    attributes: string[];
    target: number;
  }> = [];
  const maximumRequirements: Array<{
    attributes: string[];
    target: number;
  }> = [];

  // Process requirements tree FIRST to build minimumRequirements
  // Build attribute -> group mapping from provided attributeGroups param
  const attributeToGroupMap: Record<string, string[]> = {};
  attributeGroups.forEach((group) => {
    group.attributes.forEach((attr) => {
      attributeToGroupMap[attr] = group.attributes;
    });
  });

  const processRequirement = (req: Requirement) => {
    if (req.type === "simple") {
      const useAttributeConstraint = req.attributes.length >= 1;
      const constraintName = `attribute_${req.attributes.toSorted().join("_")}`;

      if (req.constraint === "maximum") {
        if (!constraints[constraintName]) constraints[constraintName] = {};
        constraints[constraintName].max = req.value;
        // Track attribute maximums for progress display
        if (useAttributeConstraint) {
          maximumRequirements.push({
            attributes: req.attributes,
            target: req.value,
          });
        }
      } else if (req.constraint === "minimum") {
        // For min with attributes: cap other attributes in the same groups
        if (useAttributeConstraint) {
          // Get all groups that contain any of the required attributes
          const affectedGroups = new Map<string, Set<string>>();

          req.attributes.forEach((minAttr) => {
            const groupAttrs = attributeToGroupMap[minAttr] || [];
            groupAttrs.forEach((attr) => {
              // Find which group this belongs to by checking all attribute groups
              for (const group of attributeGroups) {
                if (group.attributes.includes(attr)) {
                  if (!affectedGroups.has(group.id)) {
                    affectedGroups.set(group.id, new Set(group.attributes));
                  }
                  break;
                }
              }
            });
          });

          // For each group, cap the attributes that are NOT in req.attributes
          affectedGroups.forEach((groupAttrs) => {
            groupAttrs.forEach((attr) => {
              if (!req.attributes.includes(attr)) {
                const otherConstraint = `attribute_${attr}`;
                if (!constraints[otherConstraint])
                  constraints[otherConstraint] = {};
                const proposedMax = targetValue - req.value;
                constraints[otherConstraint].max = Math.min(
                  constraints[otherConstraint].max ?? proposedMax,
                  proposedMax
                );
              }
            });
          });
        }
        minimumRequirements.push({
          attributes: req.attributes,
          target: req.value,
        });
      }
      // No min constraint is added directly
    } else {
      if (req.operator === "AND") {
        req.children.forEach((child) => {
          processRequirement(child);
        });
      }

      if (req.operator === "OR") {
        throw new Error("OR operator is not supported in this solver.");
      }
    }
  };

  processRequirement(requirements);

  // Calculate score for each record based on minimum requirements fulfilled
  const calculateRecordScore = (record: (typeof records)[number]): number => {
    let minConditionsFulfilled = 0;

    for (const minReq of minimumRequirements) {
      // Check if record has all attributes required by this minimum requirement
      const hasAllAttributes = minReq.attributes.every((reqAttr) =>
        record.attributes.includes(reqAttr)
      );

      if (hasAllAttributes) {
        minConditionsFulfilled++;
      }
    }

    return 1 + minConditionsFulfilled;
  };

  // Add variables for each record (using calculated scores)
  records.forEach((record, idx) => {
    const varName = `r${idx}`;

    // Assert integer value (already checked, but double-check)
    if (!Number.isInteger(record.value)) {
      throw new Error(`Record ${idx} has non-integer value: ${record.value}`);
    }

    // Calculate score based on minimum requirements this record fulfills
    const score = calculateRecordScore(record);

    variables[varName] = {
      value: score,
    };

    // Add coefficients for each attribute and attribute combination
    // Single attributes
    record.attributes.forEach((attr) => {
      const constraintName = `attribute_${attr}`;
      variables[varName][constraintName] = 1;
    });

    // Multi-attribute combinations (all possible subsets of size > 1)
    // Generate all non-empty subsets
    const generateSubsets = (attrs: string[]): string[][] => {
      const subsets: string[][] = [];
      const n = attrs.length;

      // Iterate through all possible subsets using bit masking
      for (let i = 1; i < 1 << n; i++) {
        const subset: string[] = [];
        for (let j = 0; j < n; j++) {
          if (i & (1 << j)) {
            subset.push(attrs[j]);
          }
        }
        if (subset.length > 1) {
          subsets.push(subset.toSorted());
        }
      }
      return subsets;
    };

    const multiAttrSubsets = generateSubsets(record.attributes);
    multiAttrSubsets.forEach((subset) => {
      const constraintName = `attribute_${subset.join("_")}`;
      variables[varName][constraintName] = 1;
    });

    variables[varName][varName] = 1;

    integers.push(varName); // Force integer solution for occurrences
  });

  // Add constraint for each variable (limits the value contribution of each record)
  records.forEach((record, idx) => {
    const varName = `r${idx}`;
    constraints[varName] = { max: record.value };
  });

  // Add value constraint (total value should not exceed target)
  constraints["value"] = { max: targetValue };

  // Build the YALPS model
  const model: Model = {
    direction: "maximize",
    objective: "value",
    constraints,
    variables,
    integers: integers.length > 0 ? integers : undefined,
  };

  // Solve the model
  const result = solve(model);

  if (!result || result.status !== "optimal") {
    throw new Error(
      "No feasible solution found. Try adjusting your constraints."
    );
  }

  // Extract solution - YALPS returns variables as an array of [name, value] tuples
  const variableMap = new Map(result.variables);

  const selectedRecords = records.map((record, idx) => {
    const weight = (variableMap.get(`r${idx}`) as number) || 0;
    return {
      recordId: record.id,
      weight,
    };
  });

  // Calculate total value by summing up the actual value constraint
  // (not the score, which is what result.result contains)
  let totalValue = 0;
  records.forEach((record, idx) => {
    const weight = (variableMap.get(`r${idx}`) as number) || 0;
    totalValue += weight;
  });

  // Calculate achieved minimum requirements
  const achievedMinimums = minimumRequirements.map((minReq) => {
    let achieved = 0;
    records.forEach((record, idx) => {
      const matches = minReq.attributes.every((attr) =>
        record.attributes.includes(attr)
      );
      if (matches) {
        const weight = (variableMap.get(`r${idx}`) as number) || 0;
        achieved += weight;
      }
    });
    return {
      attributes: minReq.attributes,
      target: minReq.target,
      achieved,
    };
  });

  // Calculate used amounts for maximum requirements
  const usedMaximums = maximumRequirements.map((maxReq) => {
    let used = 0;
    records.forEach((record, idx) => {
      const matches = maxReq.attributes.every((attr) =>
        record.attributes.includes(attr)
      );
      if (matches) {
        const weight = (variableMap.get(`r${idx}`) as number) || 0;
        used += weight;
      }
    });
    return {
      attributes: maxReq.attributes,
      target: maxReq.target,
      used,
    };
  });

  return {
    totalValue,
    selectedRecords,
    minimumRequirements: achievedMinimums,
    maximumRequirements: usedMaximums,
  };
}

export function solveProblem(
  records: RecordType[],
  requirements: Requirement,
  targetValue: number,
  targetUnit: "hours" | "occurrences",
  attributeGroups: AttributeGroup[]
): Solution {
  const scaleFactor = targetUnit === "hours" ? 10 : 1;

  // Scale the problem first
  const scaled = scaleProblem(records, requirements, targetValue, scaleFactor);

  // Solve with scaled values
  const scaledSolution = solveProblemScaled(
    scaled.records,
    scaled.requirements,
    scaled.targetValue,
    attributeGroups
  );

  // Descale the solution
  return {
    totalValue: scaledSolution.totalValue / scaleFactor,
    selectedRecords: scaledSolution.selectedRecords.map((sr) => ({
      recordId: sr.recordId,
      weight: sr.weight / scaleFactor,
    })),
    minimumRequirements: scaledSolution.minimumRequirements.map((mr) => ({
      attributes: mr.attributes,
      target: mr.target / scaleFactor,
      achieved: mr.achieved / scaleFactor,
    })),
    maximumRequirements: scaledSolution.maximumRequirements?.map((mx) => ({
      attributes: mx.attributes,
      target: mx.target / scaleFactor,
      used: mx.used / scaleFactor,
    })),
  };
}
