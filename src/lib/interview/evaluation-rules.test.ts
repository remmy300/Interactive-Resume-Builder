import { describe, expect, it } from "vitest";
import { EVALUATION_RULES } from "./evaluation-rules";

describe("EVALUATION_RULES", () => {
  it("has criteria weights that total 100 for every framework", () => {
    for (const rules of Object.values(EVALUATION_RULES)) {
      const total = rules.reduce((sum, rule) => sum + rule.weight, 0);

      expect(total).toBe(100);
    }
  });

  it("has unique criterion IDs within each framework", () => {
    for (const rules of Object.values(EVALUATION_RULES)) {
      const ids = rules.map((rule) => rule.id);

      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("provides feedback and indicators for every criterion", () => {
    for (const rules of Object.values(EVALUATION_RULES)) {
      for (const rule of rules) {
        expect(rule.indicators.length).toBeGreaterThan(0);
        expect(rule.missingFeedback.length).toBeGreaterThan(0);
        expect(rule.partialFeedback.length).toBeGreaterThan(0);
        expect(rule.strongFeedback.length).toBeGreaterThan(0);
      }
    }
  });
});
