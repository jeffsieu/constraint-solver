export interface AttributeGroup {
  id: string;
  name: string;
  attributes: string[];
}

export interface Record {
  id: string;
  value: number;
  attributes: string[];
}

export interface SimpleRequirement {
  id: string;
  type: "simple";
  constraint: "minimum" | "maximum";
  value: number;
  attributes: string[];
}

export interface ComplexRequirement {
  id: string;
  type: "complex";
  operator: "AND" | "OR";
  children: Requirement[];
}

export type Requirement = SimpleRequirement | ComplexRequirement;

export interface SimpleRequirementResult {
  id: string;
  type: "simple";
  constraint: "minimum" | "maximum";
  attributes: string[];
  target: number;
  achieved?: number;
  used?: number;
}

export interface ComplexRequirementResult {
  id: string;
  type: "complex";
  operator: "AND" | "OR";
  children: RequirementResult[];
}

export type RequirementResult =
  | SimpleRequirementResult
  | ComplexRequirementResult;

export interface Solution {
  totalValue: number;
  selectedRecords: {
    recordId: string;
    weight: number;
  }[];
  minimumRequirements: {
    attributes: string[];
    target: number;
    achieved: number;
  }[];
  maximumRequirements?: {
    attributes: string[];
    target: number;
    used: number;
  }[];
  requirementResults?: RequirementResult;
}
