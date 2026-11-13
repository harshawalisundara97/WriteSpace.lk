import { describe, it, expect } from "vitest";
import { addressBookSchema } from "@/lib/validation/address";

const valid = {
  full_name: "Nimali Perera",
  phone: "+94 77 123 4567",
  line1: "42 Galle Road",
  city: "Colombo 03",
};

describe("addressBookSchema", () => {
  it("accepts a minimal valid address and defaults country + is_default", () => {
    const r = addressBookSchema.parse(valid);
    expect(r.country).toBe("LK");
    expect(r.is_default).toBe(false);
  });

  it("keeps optional fields and the default flag", () => {
    const r = addressBookSchema.parse({ ...valid, label: "Home", line2: "Apt 4", postal_code: "00300", is_default: true });
    expect(r.label).toBe("Home");
    expect(r.is_default).toBe(true);
  });

  it("rejects a missing street line", () => {
    expect(addressBookSchema.safeParse({ ...valid, line1: "" }).success).toBe(false);
  });

  it("rejects a too-short name and a too-short phone", () => {
    expect(addressBookSchema.safeParse({ ...valid, full_name: "N" }).success).toBe(false);
    expect(addressBookSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("rejects a missing city", () => {
    expect(addressBookSchema.safeParse({ ...valid, city: "" }).success).toBe(false);
  });
});
