import { describe, it, expect } from "vitest";
import {
  createFirmSchema,
  createLawyerSchema,
  firmFilterSchema,
  lawyerFilterSchema,
  FIRM_TYPE_LABELS,
  LAWYER_ROLE_LABELS,
} from "@/lib/schemas";

describe("createFirmSchema", () => {
  it("validates a minimal valid firm", () => {
    const result = createFirmSchema.safeParse({
      name: "Baker McKenzie",
      country: "Thailand",
      city: "Bangkok",
      firmType: "FULL_SERVICE",
    });
    expect(result.success).toBe(true);
  });

  it("validates a fully populated firm", () => {
    const result = createFirmSchema.safeParse({
      name: "Kudun & Partners",
      shortName: "Kudun",
      country: "Thailand",
      city: "Bangkok",
      website: "https://www.kap.co.th",
      firmType: "BOUTIQUE",
      headcount: 65,
      foundedYear: 2015,
      notes: "Spin-off from Baker McKenzie",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createFirmSchema.safeParse({
      name: "",
      country: "Thailand",
      city: "Bangkok",
      firmType: "FULL_SERVICE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid firm type", () => {
    const result = createFirmSchema.safeParse({
      name: "Test",
      country: "Thailand",
      city: "Bangkok",
      firmType: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid website URL", () => {
    const result = createFirmSchema.safeParse({
      name: "Test",
      country: "Thailand",
      city: "Bangkok",
      firmType: "FULL_SERVICE",
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty website string", () => {
    const result = createFirmSchema.safeParse({
      name: "Test",
      country: "Thailand",
      city: "Bangkok",
      firmType: "FULL_SERVICE",
      website: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("createLawyerSchema", () => {
  it("validates a minimal lawyer", () => {
    const result = createLawyerSchema.safeParse({
      name: "John Smith",
    });
    expect(result.success).toBe(true);
  });

  it("validates a fully populated lawyer", () => {
    const result = createLawyerSchema.safeParse({
      name: "Kullarat Phongsathaporn",
      email: "kullarat@example.com",
      title: "Managing Partner",
      qualificationYear: 1994,
      barAdmissions: "Thai Bar",
      bio: "Leading M&A practitioner",
      linkedInUrl: "https://linkedin.com/in/kullarat",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createLawyerSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createLawyerSchema.safeParse({
      name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("firmFilterSchema", () => {
  it("applies defaults for page and pageSize", () => {
    const result = firmFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("parses string page numbers", () => {
    const result = firmFilterSchema.parse({ page: "3", pageSize: "10" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
  });
});

describe("lawyerFilterSchema", () => {
  it("applies defaults", () => {
    const result = lawyerFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

describe("display label maps", () => {
  it("has labels for all firm types", () => {
    expect(Object.keys(FIRM_TYPE_LABELS)).toHaveLength(5);
    expect(FIRM_TYPE_LABELS.FULL_SERVICE).toBe("Full Service");
    expect(FIRM_TYPE_LABELS.BOUTIQUE).toBe("Boutique");
  });

  it("has labels for all lawyer roles", () => {
    expect(Object.keys(LAWYER_ROLE_LABELS)).toHaveLength(5);
    expect(LAWYER_ROLE_LABELS.PARTNER).toBe("Partner");
    expect(LAWYER_ROLE_LABELS.OF_COUNSEL).toBe("Of Counsel");
  });
});
