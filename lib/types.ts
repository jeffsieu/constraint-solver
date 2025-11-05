export interface AttributeGroup {
  id: string
  name: string
  attributes: string[]
}

export interface Record {
  id: string
  value: number
  attributes: string[]
}

export interface SimpleRequirement {
  id: string
  type: "simple"
  constraint: "minimum" | "maximum"
  value: number
  attributes: string[]
}

export interface ComplexRequirement {
  id: string
  type: "complex"
  operator: "AND" | "OR"
  children: Requirement[]
}

export type Requirement = SimpleRequirement | ComplexRequirement

export interface Solution {
  totalValue: number
  selectedRecords: {
    recordId: string
    weight: number
  }[]
  minimumRequirements: {
    attributes: string[]
    target: number
    achieved: number
  }[]
}
