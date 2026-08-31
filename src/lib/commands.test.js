import { describe, it, expect, vi } from "vitest";
import { buildCommands, CATEGORIES } from "./commands.js";

const commands = buildCommands();

describe("unified command registry", () => {
  it("has no duplicate ids", () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every command valid metadata", () => {
    for (const c of commands) {
      expect(typeof c.id).toBe("string");
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.label).toBe("string");
      expect(c.label.length).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(c.category);
      expect(Array.isArray(c.keywords)).toBe(true);
      expect(["transform", "tool", "action"]).toContain(c.type);
      expect(typeof c.run).toBe("function");
    }
  });

  it("covers every category and all developer tools", () => {
    for (const cat of CATEGORIES) {
      expect(commands.some((c) => c.category === cat)).toBe(true);
    }
    const devIds = commands.filter((c) => c.type === "tool").map((c) => c.id);
    expect(devIds).toEqual([
      "tool-json",
      "tool-base64",
      "tool-url",
      "tool-hash",
      "tool-regex",
      "tool-encrypt",
    ]);
  });

  it("routes a transform command through ctx.applyTransform", () => {
    const ctx = { applyTransform: vi.fn() };
    commands.find((c) => c.id === "uppercase").run(ctx);
    expect(ctx.applyTransform).toHaveBeenCalledTimes(1);
    const [fn, label] = ctx.applyTransform.mock.calls[0];
    expect(fn("ab")).toBe("AB");
    expect(label).toBe("UPPERCASE");
  });

  it("routes a tool command through ctx.openTool", () => {
    const ctx = { openTool: vi.fn() };
    commands.find((c) => c.id === "tool-regex").run(ctx);
    expect(ctx.openTool).toHaveBeenCalledWith("regex");
  });

  it("routes action commands through their ctx methods", () => {
    const ctx = {
      openFind: vi.fn(),
      openHistory: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      copyAll: vi.fn(),
      clear: vi.fn(),
      toggleTheme: vi.fn(),
    };
    for (const [id, key] of [
      ["find-replace", "openFind"],
      ["history", "openHistory"],
      ["undo", "undo"],
      ["redo", "redo"],
      ["copy-all", "copyAll"],
      ["clear-editor", "clear"],
      ["toggle-theme", "toggleTheme"],
    ]) {
      commands.find((c) => c.id === id).run(ctx);
      expect(ctx[key]).toHaveBeenCalled();
    }
  });
});
