import type {
  Record as RecordType,
  Requirement,
  SimpleRequirement,
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

interface SimpleScaledProblem {
  records: RecordType[];
  requirements: SimpleRequirement[];
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

/**
 * Recursively expands a requirement tree into all possible combinations of simple requirements.
 * Each combination represents one way to satisfy the requirement tree when all ORs are resolved.
 *
 * For example:
 * - (1 AND 2) OR (3 AND 4) => [[1, 2], [3, 4]]
 * - (1 OR 2) AND 3 => [[1, 3], [2, 3]]
 */
function expandRequirementCombinations(
  req: Requirement
): SimpleRequirement[][] {
  if (req.type === "simple") {
    return [[req]];
  }

  if (req.operator === "AND") {
    // For AND: take cartesian product of all child combinations
    // Start with [[]] (one empty combination)
    let result: SimpleRequirement[][] = [[]];

    for (const child of req.children) {
      const childCombinations = expandRequirementCombinations(child);
      const newResult: SimpleRequirement[][] = [];

      // Combine each existing combination with each child combination
      for (const existingCombo of result) {
        for (const childCombo of childCombinations) {
          newResult.push([...existingCombo, ...childCombo]);
        }
      }

      result = newResult;
    }

    return result;
  }

  if (req.operator === "OR") {
    // For OR: concatenate all child combinations
    const result: SimpleRequirement[][] = [];

    for (const child of req.children) {
      const childCombinations = expandRequirementCombinations(child);
      result.push(...childCombinations);
    }

    return result;
  }

  throw new Error(`Unknown requirement operator: ${(req as any).operator}`);
}

/**
 * Creates multiple problem variants by expanding OR operators in the requirement tree.
 * Each variant represents one possible combination of requirements.
 */
function createProblemCombinations(
  problem: ScaledProblem
): SimpleScaledProblem[] {
  const combinations = expandRequirementCombinations(problem.requirements);

  return combinations.map((requirements) => ({
    records: problem.records,
    requirements,
    targetValue: problem.targetValue,
    scaleFactor: problem.scaleFactor,
  }));
}

function solveSimpleProblemScaled(
  records: RecordType[],
  requirements: SimpleRequirement[],
  targetValue: number,
  attributeGroups: AttributeGroup[]
): Solution {
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

  // Process simple requirements to build minimumRequirements and collect minimum combinations
  const minimumCombinations: string[][] = [];

  requirements.forEach((req) => {
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
      // Collect this combination for later "not_attribute" generation
      if (useAttributeConstraint) {
        minimumCombinations.push(req.attributes.toSorted());
        const constraintName = `not_attribute_${req.attributes
          .toSorted()
          .join("_")}`;
        if (!constraints[constraintName]) constraints[constraintName] = {};
        const proposedMax = targetValue - req.value;
        constraints[constraintName].max = Math.min(
          constraints[constraintName].max ?? proposedMax,
          proposedMax
        );
      }
      minimumRequirements.push({
        attributes: req.attributes,
        target: req.value,
      });
    }
  });

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
      value: 1,
      score,
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

    // Add "not_attribute" coefficients for minimum combinations this record does NOT match
    minimumCombinations.forEach((combination) => {
      // Check if record has all attributes in this combination
      const matchesCombination = combination.every((attr) =>
        record.attributes.includes(attr)
      );

      // If record does NOT match this combination, add coefficient for "not_attribute"
      if (!matchesCombination) {
        const constraintName = `not_attribute_${combination
          .toSorted()
          .join("_")}`;
        variables[varName][constraintName] = 1;
      }
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
    objective: "score",
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

  // Expand OR operators into multiple problem combinations
  const problemCombinations = createProblemCombinations(scaled);

  // Solve each combination and pick the best one
  let bestSolution: Solution | null = null;
  let bestScore = -Infinity;

  for (const simpleProblem of problemCombinations) {
    try {
      const scaledSolution = solveSimpleProblemScaled(
        simpleProblem.records,
        simpleProblem.requirements,
        simpleProblem.targetValue,
        attributeGroups
      );

      // Calculate a score for this solution (total value achieved)
      const score = scaledSolution.totalValue;

      if (score > bestScore) {
        bestScore = score;
        bestSolution = scaledSolution;
      }
    } catch (e) {
      // If this combination has no feasible solution, skip it
      console.warn("Skipping infeasible combination:", e);
      continue;
    }
  }

  if (!bestSolution) {
    throw new Error(
      "No feasible solution found for any combination. Try adjusting your constraints."
    );
  }

  // Descale the best solution
  return {
    totalValue: bestSolution.totalValue / scaleFactor,
    selectedRecords: bestSolution.selectedRecords.map((sr) => ({
      recordId: sr.recordId,
      weight: sr.weight / scaleFactor,
    })),
    minimumRequirements: bestSolution.minimumRequirements.map((mr) => ({
      attributes: mr.attributes,
      target: mr.target / scaleFactor,
      achieved: mr.achieved / scaleFactor,
    })),
    maximumRequirements: bestSolution.maximumRequirements?.map((mx) => ({
      attributes: mx.attributes,
      target: mx.target / scaleFactor,
      used: mx.used / scaleFactor,
    })),
  };
}
