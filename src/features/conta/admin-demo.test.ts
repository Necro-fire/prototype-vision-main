import { describe, expect, it } from "vitest";
import { checkAdmin } from "./admin-demo";

describe("Acesso administrativo demonstrativo", () => {
  it("aceita só as credenciais administrativas", () => {
    expect(checkAdmin("admin@slick.demo", "slick123")).toBe(true);
    expect(checkAdmin("admin@slick.demo", "x")).toBe(false);
  });
});
