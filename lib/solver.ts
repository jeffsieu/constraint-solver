import type { Record as RecordType, Requirement, Solution } from "./types";
import type { Model } from "yalps";

// Import the solver dynamically to avoid SSR issues
let solve: any = null;
if (typeof window !== "undefined") {
  import("yalps").then((module) => {
    solve = module.solve;
  });
}

export function solveProblem(
  records: RecordType[],
  requirements: Requirement,
  targetValue: number,
  targetUnit: "hours" | "occurrences"
): Solution {
  if (!solve) {
    throw new Error("Solver not loaded yet. Please try again.");
  }

  // Scale factor for converting to integers (multiply by 10 to handle 0.1 precision)
  const SCALE = 10;

  // Build the LP model for YALPS
  const constraints: { [key: string]: { min?: number; max?: number } } = {};
  const variables: { [key: string]: { [key: string]: number } } = {};
  const integers: string[] = [];

  console.log("[v0] Building LP model with records:", records);
  console.log("[v0] Target value:", targetValue, "Unit:", targetUnit);

  // Add variables for each record
  records.forEach((record, idx) => {
    const varName = `r${idx}`;
    const scaledValue = Math.round(record.value * SCALE);

    variables[varName] = {
      totalValue: scaledValue,
    };

    if (targetUnit === "hours") {
      // Hours can be split into 0.1 units, so max weight is 1.0 (scaled to 10)
      constraints[`${varName}_max`] = { max: 10 }; // 1.0 * SCALE
      variables[varName][`${varName}_max`] = 1;
    } else {
      // Occurrences: can only take full record (weight = 1) or nothing (weight = 0)
      constraints[`${varName}_max`] = { max: 10 }; // 1.0 * SCALE
      variables[varName][`${varName}_max`] = 1;
      integers.push(varName); // Force integer solution for occurrences
    }

    // Add min constraint (>= 0)
    constraints[`${varName}_min`] = { min: 0 };
    variables[varName][`${varName}_min`] = 1;
  });

  const minimumRequirements: Array<{
    attributes: string[];
    target: number;
  }> = [];

  // Process requirements tree
  const processRequirement = (req: Requirement, constraintPrefix: string) => {
    if (req.type === "simple") {
      const constraintName = `${constraintPrefix}_${req.id}`;
      const constraint: any = {};

      // Find matching records
      records.forEach((record, idx) => {
        const matches = req.attributes.every((attr) =>
          record.attributes.includes(attr)
        );
        if (matches) {
          constraint[`r${idx}`] = Math.round(record.value * SCALE);
        }
      });

      if (req.constraint === "maximum") {
        constraint.max = Math.round(req.value * SCALE);
      } else {
        constraint.min = Math.round(req.value * SCALE);
        minimumRequirements.push({
          attributes: req.attributes,
          target: req.value,
        });
      }

      constraints[constraintName] = constraint;
    } else {
      // Complex requirement
      req.children.forEach((child, idx) => {
        processRequirement(child, `${constraintPrefix}_${req.operator}_${idx}`);
      });
    }
  };

  processRequirement(requirements, "req");

  // Build the YALPS model
  const model: Model = {
    direction: "maximize",
    objective: "totalValue",
    constraints,
    variables,
    integers: integers.length > 0 ? integers : undefined,
  };

  console.log("[v0] Complete LP model:", JSON.stringify(model, null, 2));

  // Solve the model
  const result = solve(model);

  console.log("[v0] Solver result:", result);
  console.log("[v0] Result status:", result.status);
  console.log("[v0] Result keys:", result ? Object.keys(result) : "null");

  if (!result || result.status !== "optimal") {
    throw new Error(
      "No feasible solution found. Try adjusting your constraints."
    );
  }

  // Extract solution - YALPS returns variables as an array of [name, value] tuples
  const variableMap = new Map(result.variables);

  const selectedRecords = records.map((record, idx) => {
    const weight = ((variableMap.get(`r${idx}`) as number) || 0) / SCALE;
    console.log(`[v0] Record ${idx} (${record.value}): weight = ${weight}`);
    return {
      recordId: record.id,
      weight,
    };
  });

  const totalValue = result.result !== undefined ? result.result / SCALE : 0;
  console.log(
    "[v0] Total value:",
    totalValue,
    "from result.result:",
    result.result
  );

  // Calculate achieved minimum requirements
  const achievedMinimums = minimumRequirements.map((minReq) => {
    let achieved = 0;
    records.forEach((record, idx) => {
      const matches = minReq.attributes.every((attr) =>
        record.attributes.includes(attr)
      );
      if (matches) {
        const weight = ((variableMap.get(`r${idx}`) as number) || 0) / SCALE;
        achieved += record.value * weight;
      }
    });
    return {
      attributes: minReq.attributes,
      target: minReq.target,
      achieved,
    };
  });

  return {
    totalValue,
    selectedRecords,
    minimumRequirements: achievedMinimums,
  };
}
