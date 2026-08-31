// The single source of truth for every discoverable action. Consumed by the
// command palette, the Clean menu, and (indirectly) the toolbar.
//
// A command:
//   { id, label, category, group?, description?, keywords[], shortcut?, type, run(ctx) }
//
// type: "transform" → run calls ctx.applyTransform(fn, label)
//       "tool"      → run calls ctx.openTool(id)
//       "action"    → run performs an app action via ctx
//
// ctx is assembled in App and passed to run().

import {
  upperCase,
  lowerCase,
  titleCase,
  sentenceCase,
  camelCase,
  pascalCase,
  snakeCase,
  kebabCase,
  constantCase,
} from "./text/case.js";
import { removeExtraSpaces } from "./text/whitespace.js";
import { CLEAN_ACTIONS } from "./cleanActions.js";
import { DEV_TOOLS } from "../components/tools/devTools.js";

export const CATEGORIES = ["Transform", "Clean", "Write", "Developer"];

const CASE_COMMANDS = [
  ["uppercase", "UPPERCASE", upperCase, ["upper", "caps", "all caps"]],
  ["lowercase", "lowercase", lowerCase, ["lower", "downcase"]],
  ["title-case", "Title Case", titleCase, ["title", "capitalize", "headline"]],
  ["sentence-case", "Sentence case", sentenceCase, ["sentence"]],
  ["camel-case", "camelCase", camelCase, ["camel", "variable", "identifier"]],
  ["pascal-case", "PascalCase", pascalCase, ["pascal", "class name"]],
  ["snake-case", "snake_case", snakeCase, ["snake", "underscore"]],
  ["kebab-case", "kebab-case", kebabCase, ["kebab", "dash", "slug"]],
  ["constant-case", "CONSTANT_CASE", constantCase, ["constant", "screaming", "env"]],
];

export function buildCommands() {
  const transforms = CASE_COMMANDS.map(([id, label, fn, keywords]) => ({
    id,
    label,
    category: "Transform",
    keywords,
    type: "transform",
    run: (ctx) => ctx.applyTransform(fn, label),
  }));

  const removeSpaces = {
    id: "remove-extra-spaces",
    label: "Remove extra spaces",
    category: "Clean",
    group: "Whitespace",
    keywords: ["spaces", "whitespace", "collapse", "trim"],
    type: "transform",
    run: (ctx) => ctx.applyTransform(removeExtraSpaces, "Remove spaces"),
  };

  const clean = CLEAN_ACTIONS.map((action) => ({
    id: `clean-${action.id}`,
    label: action.label,
    category: "Clean",
    group: action.group,
    keywords: [action.group.toLowerCase(), ...action.label.toLowerCase().split(/[\s()→/]+/).filter(Boolean)],
    type: "transform",
    run: (ctx) => ctx.applyTransform(action.run, action.label),
  }));

  const developer = DEV_TOOLS.map((tool) => ({
    id: `tool-${tool.id}`,
    label: `${tool.label} tool`,
    category: "Developer",
    description: tool.description,
    keywords: tool.keywords,
    type: "tool",
    run: (ctx) => ctx.openTool(tool.id),
  }));

  const actions = [
    {
      id: "find-replace",
      label: "Find & Replace",
      category: "Write",
      keywords: ["find", "replace", "search", "substitute"],
      shortcut: "F",
      type: "action",
      run: (ctx) => ctx.openFind(),
    },
    {
      id: "history",
      label: "History",
      category: "Write",
      keywords: ["history", "timeline", "versions", "revisions", "states"],
      type: "action",
      run: (ctx) => ctx.openHistory(),
    },
    {
      id: "undo",
      label: "Undo",
      category: "Write",
      keywords: ["undo", "back", "revert"],
      shortcut: "Z",
      type: "action",
      run: (ctx) => ctx.undo(),
    },
    {
      id: "redo",
      label: "Redo",
      category: "Write",
      keywords: ["redo", "forward"],
      shortcut: "⇧Z",
      type: "action",
      run: (ctx) => ctx.redo(),
    },
    {
      id: "copy-all",
      label: "Copy all text",
      category: "Write",
      keywords: ["copy", "clipboard", "all"],
      type: "action",
      run: (ctx) => ctx.copyAll(),
    },
    {
      id: "clear-editor",
      label: "Clear editor",
      category: "Write",
      keywords: ["clear", "empty", "delete all", "reset"],
      type: "action",
      run: (ctx) => ctx.clear(),
    },
    {
      id: "toggle-theme",
      label: "Toggle light / dark theme",
      category: "Write",
      keywords: ["theme", "dark", "light", "mode", "appearance"],
      type: "action",
      run: (ctx) => ctx.toggleTheme(),
    },
  ];

  return [...transforms, removeSpaces, ...clean, ...developer, ...actions];
}

/** Text a command is matched against in the palette. */
export const commandSearchText = (c) =>
  `${c.label} ${c.category} ${(c.keywords || []).join(" ")}`;
