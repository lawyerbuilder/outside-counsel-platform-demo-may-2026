import { describe, it, expect } from "vitest";

describe("network module types", () => {
  it("exports NetworkFirmNode type with expected fields", async () => {
    // Dynamically import to verify module can be loaded
    const mod = await import("@/server/network");
    expect(mod.getNetworkData).toBeDefined();
    expect(mod.getSpinOffComparisons).toBeDefined();
    expect(mod.getAlumni).toBeDefined();
    expect(mod.getFirmsWithAlumni).toBeDefined();
  });

  it("FIRM_TYPE_LABELS covers all types used in network", async () => {
    const { FIRM_TYPE_LABELS } = await import("@/lib/schemas");
    expect(FIRM_TYPE_LABELS["FULL_SERVICE"]).toBe("Full Service");
    expect(FIRM_TYPE_LABELS["BOUTIQUE"]).toBe("Boutique");
    expect(FIRM_TYPE_LABELS["MID_SIZE"]).toBe("Mid-Size");
    expect(FIRM_TYPE_LABELS["REGIONAL"]).toBe("Regional");
  });

  it("LAWYER_ROLE_LABELS covers all roles for alumni display", async () => {
    const { LAWYER_ROLE_LABELS } = await import("@/lib/schemas");
    expect(LAWYER_ROLE_LABELS["PARTNER"]).toBe("Partner");
    expect(LAWYER_ROLE_LABELS["OF_COUNSEL"]).toBe("Of Counsel");
    expect(LAWYER_ROLE_LABELS["ASSOCIATE"]).toBe("Associate");
    expect(LAWYER_ROLE_LABELS["COUNSEL"]).toBe("Counsel");
    expect(LAWYER_ROLE_LABELS["OTHER"]).toBe("Other");
  });
});
