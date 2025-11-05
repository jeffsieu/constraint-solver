import type { Record } from "./types";

export interface TestScenario {
  name: string;
  records: Record[];
}

export const testScenarios: TestScenario[] = [
  {
    name: "Test 1: Basic feasible",
    records: [
      { id: "t1-local-night", value: 5, attributes: ["Local", "Night"] },
      { id: "t1-local-day", value: 2, attributes: ["Local", "Day"] },
      { id: "t1-global-day", value: 3, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 2: Exact min requirements",
    records: [
      { id: "t2-local-night-1", value: 3, attributes: ["Local", "Night"] },
      { id: "t2-local-night-2", value: 2, attributes: ["Local", "Night"] },
      { id: "t2-local-day", value: 2, attributes: ["Local", "Day"] },
      { id: "t2-global-day", value: 3, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 3: Overshoot prevention",
    records: [
      { id: "t3-local-night", value: 8, attributes: ["Local", "Night"] },
      { id: "t3-local-day", value: 5, attributes: ["Local", "Day"] },
      { id: "t3-global-day", value: 3, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 4: Global max constraint",
    records: [
      { id: "t4-global-night", value: 6, attributes: ["Global", "Night"] },
      { id: "t4-global-day", value: 6, attributes: ["Global", "Day"] },
      { id: "t4-local-night", value: 8, attributes: ["Local", "Night"] },
    ],
  },
  {
    name: "Test 5: Implicit max (min Night = 5, max Day = 5)",
    records: [
      { id: "t5-local-night", value: 5, attributes: ["Local", "Night"] },
      { id: "t5-global-night", value: 3, attributes: ["Global", "Night"] },
      { id: "t5-local-day", value: 6, attributes: ["Local", "Day"] },
      { id: "t5-global-day", value: 4, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 6: Partial records only",
    records: [
      { id: "t6-local-night-1", value: 2, attributes: ["Local", "Night"] },
      { id: "t6-local-night-2", value: 2, attributes: ["Local", "Night"] },
      { id: "t6-local-night-3", value: 2, attributes: ["Local", "Night"] },
      { id: "t6-local-day-1", value: 1, attributes: ["Local", "Day"] },
      { id: "t6-local-day-2", value: 1, attributes: ["Local", "Day"] },
      { id: "t6-global-day", value: 2, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 7: Choose min over other",
    records: [
      { id: "t7-local-night", value: 5, attributes: ["Local", "Night"] },
      { id: "t7-local-day", value: 2, attributes: ["Local", "Day"] },
      { id: "t7-global-night", value: 3, attributes: ["Global", "Night"] },
      { id: "t7-global-day", value: 3, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 8: Infeasible (too little)",
    records: [
      { id: "t8-local-night", value: 3, attributes: ["Local", "Night"] },
      { id: "t8-local-day", value: 1, attributes: ["Local", "Day"] },
      { id: "t8-global-day", value: 2, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 9: Complex mix",
    records: [
      { id: "t9-local-night-1", value: 2, attributes: ["Local", "Night"] },
      { id: "t9-local-night-2", value: 3, attributes: ["Local", "Night"] },
      { id: "t9-local-day", value: 3, attributes: ["Local", "Day"] },
      { id: "t9-global-night", value: 2, attributes: ["Global", "Night"] },
      { id: "t9-global-day-1", value: 1, attributes: ["Global", "Day"] },
      { id: "t9-global-day-2", value: 1, attributes: ["Global", "Day"] },
    ],
  },
  {
    name: "Test 10: Boundary conditions",
    records: [
      { id: "t10-local-night", value: 5, attributes: ["Local", "Night"] },
      { id: "t10-local-day", value: 2, attributes: ["Local", "Day"] },
      { id: "t10-global-day", value: 4, attributes: ["Global", "Day"] },
      { id: "t10-global-night", value: 1, attributes: ["Global", "Night"] },
    ],
  },
];
