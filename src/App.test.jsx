// @vitest-environment jsdom
import { render, screen, within, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import App from "./App.jsx";

const getEditor = () => screen.getByRole("textbox", { name: /your text/i });

describe("App — transforms & stats", () => {
  it("types, counts, and transforms the whole document when nothing is selected", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();

    await user.type(editor, "hello   world");
    expect(
      await screen.findByText("2 words, 13 characters", {}, { timeout: 2000 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /uppercase/i }));
    expect(editor).toHaveValue("HELLO   WORLD");

    await user.click(screen.getByRole("button", { name: /title case/i }));
    expect(editor).toHaveValue("Hello   World");

    await user.click(screen.getByRole("button", { name: /remove extra spaces/i }));
    expect(editor).toHaveValue("Hello World");
  });

  it("transforms only the selection when there is one, and re-selects the result", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "hello world");
    editor.setSelectionRange(0, 5);

    await user.click(screen.getByRole("button", { name: /uppercase/i }));

    expect(editor).toHaveValue("HELLO world");
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(5);
  });
});

describe("App — history", () => {
  it("undoes and redoes a transform", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "sample text");

    await user.click(screen.getByRole("button", { name: /uppercase/i }));
    expect(editor).toHaveValue("SAMPLE TEXT");

    await user.click(screen.getByRole("button", { name: /^undo$/i }));
    expect(editor).toHaveValue("sample text");

    await user.click(screen.getByRole("button", { name: /^redo$/i }));
    expect(editor).toHaveValue("SAMPLE TEXT");
  });

  it("clears text and restores it with undo", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "keep me");

    await user.click(screen.getByRole("button", { name: /clear all text/i }));
    expect(editor).toHaveValue("");

    await user.click(await screen.findByRole("button", { name: /^undo$/i }));
    expect(editor).toHaveValue("keep me");
  });
});

describe("App — find & replace", () => {
  it("opens, counts matches, and replaces all", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "one fish two fish red fish");

    await user.keyboard("{Control>}f{/Control}");
    const bar = screen.getByRole("search", { name: /find and replace/i });
    await user.type(within(bar).getByLabelText("Find"), "fish");
    expect(await within(bar).findByText("1 / 3")).toBeInTheDocument();

    await user.type(within(bar).getByLabelText("Replace with"), "cat");
    await user.click(within(bar).getByRole("button", { name: /^all$/i }));
    expect(editor).toHaveValue("one cat two cat red cat");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });
});

describe("App — clean rail", () => {
  it("runs a cleaning action from the rail and undoes it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "apple\nbanana\napple\norange");

    await user.click(screen.getByRole("button", { name: /^duplicate lines$/i }));
    await user.click(
      await screen.findByRole("button", { name: /remove duplicates \(keep first\)/i }),
    );
    expect(editor).toHaveValue("apple\nbanana\norange");

    await user.click(screen.getByRole("button", { name: /^undo$/i }));
    expect(editor).toHaveValue("apple\nbanana\napple\norange");
  });

  it("cleans only the selection when there is one", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "keep\n1a2b3c\nme");
    editor.setSelectionRange(5, 11); // "1a2b3c"

    await user.click(screen.getByRole("button", { name: /^characters$/i }));
    await user.click(await screen.findByRole("button", { name: /^remove numbers$/i }));

    expect(editor).toHaveValue("keep\nabc\nme");
    expect(editor.selectionStart).toBe(5);
    expect(editor.selectionEnd).toBe(8);
  });
});

describe("App — developer tools", () => {
  it("opens the tool surface and formats JSON into the result", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste('{"name":"Mukul","skills":["Java","React"]}');

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });

    await user.click(within(surface).getByRole("button", { name: /^format$/i }));
    expect(await within(surface).findByText(/formatted/i)).toBeInTheDocument();
    expect(await within(surface).findByLabelText("Result")).toHaveValue(
      '{\n  "name": "Mukul",\n  "skills": [\n    "Java",\n    "React"\n  ]\n}',
    );
    // tools no longer push into the editor
    expect(within(surface).queryByRole("button", { name: /replace editor/i })).not.toBeInTheDocument();
  });

  it("shows the sealed 'Validated' state for valid JSON", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(getEditor());
    await user.paste('{"ok":true}');

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });
    await user.click(within(surface).getByRole("button", { name: /^validate$/i }));

    expect(await within(surface).findByText(/^validated$/i)).toBeInTheDocument();
    expect(within(surface).getByText(/valid json/i)).toBeInTheDocument();
  });

  it("shows the sealed 'Invalid JSON' state with the error location for bad JSON", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("{ nope ");

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });
    await user.click(within(surface).getByRole("button", { name: /^validate$/i }));

    expect(await within(surface).findByText(/invalid json/i)).toBeInTheDocument();
    expect(within(surface).getByText(/line \d+, column \d+/i)).toBeInTheDocument();
    expect(editor).toHaveValue("{ nope ");
  });

  it("shows an inline error for invalid JSON and never overwrites the editor", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.click(editor);
    await user.paste("{ not json ");

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });
    await user.click(within(surface).getByRole("button", { name: /^format$/i }));

    expect(await within(surface).findByRole("alert")).toBeInTheDocument();
    expect(editor).toHaveValue("{ not json ");
  });

  it("switches tools and round-trips Base64", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "café 😀");

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });
    await user.click(within(surface).getByRole("tab", { name: "Base64" }));

    // each tool is its own lazy chunk now — wait for it, not just for the tab
    await user.click(await within(surface).findByRole("button", { name: /^encode$/i }));
    expect(await within(surface).findByLabelText("Result")).toHaveValue("Y2Fmw6kg8J+YgA==");

    await user.keyboard("{Escape}");
    await waitForElementToBeRemoved(() =>
      screen.queryByRole("region", { name: /developer tools/i }),
    );
  });

  it("tests a regex and counts matches", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "a1 b22 c333");

    await user.click(screen.getByRole("button", { name: "Developer" }));
    const surface = await screen.findByRole("region", { name: /developer tools/i });
    await user.click(within(surface).getByRole("tab", { name: "Regex" }));
    await user.type(await within(surface).findByLabelText(/pattern/i), "\\d+");

    expect(await within(surface).findByText(/^3 matches/)).toBeInTheDocument();
  });
});

describe("App — views", () => {
  it("switches between Write, Developer and Contact via the nav", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(getEditor()).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Developer" }));
    expect(await screen.findByRole("region", { name: /developer tools/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /your text/i })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(await screen.findByRole("heading", { name: /say hello/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Write" }));
    expect(await screen.findByRole("textbox", { name: /your text/i })).toBeInTheDocument();
  });

  it("applies a Transform pill from the Write rail without leaving Write", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "hello");

    await user.click(screen.getByRole("button", { name: "UPPERCASE" }));

    expect(getEditor()).toHaveValue("HELLO");
    expect(screen.queryByRole("region", { name: /developer tools/i })).not.toBeInTheDocument();
  });

  it("opens the Typing Speed view and returns to Write", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Typing Speed" }));
    expect(await screen.findByLabelText(/type the passage here/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: /your text/i })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Write" }));
    expect(await screen.findByRole("textbox", { name: /your text/i })).toBeInTheDocument();
  });
});

describe("App — contact", () => {
  it("validates, sends, and shows the delivered state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Contact" }));
    const form = (await screen.findByRole("heading", { name: /say hello/i })).closest(".contactview");

    await user.click(within(form).getByRole("button", { name: /seal & send/i }));
    expect(await within(form).findByText(/enter your name/i)).toBeInTheDocument();

    await user.type(within(form).getByLabelText(/my name is/i), "Jane");
    await user.type(within(form).getByLabelText(/reach me at/i), "jane@example.com");
    await user.type(within(form).getByLabelText(/wanted to say/i), "This is a real message.");
    await user.click(within(form).getByRole("button", { name: /seal & send/i }));

    expect(await screen.findByText(/message delivered/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/contact", expect.objectContaining({ method: "POST" }));

    // "Write another" reopens the same letter — blank, and writable again.
    await user.click(within(form).getByRole("button", { name: /write another/i }));
    const name = await within(form).findByLabelText(/my name is/i);
    expect(name).toHaveValue("");
    expect(within(form).getByLabelText(/wanted to say/i)).toHaveValue("");
    expect(within(form).queryByText(/message delivered/i)).not.toBeInTheDocument();
    await user.type(name, "Jane again");
    expect(name).toHaveValue("Jane again");
    vi.unstubAllGlobals();
  });

  it("surfaces a send failure with a mailto fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "nope" }) }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Contact" }));
    const form = (await screen.findByRole("heading", { name: /say hello/i })).closest(".contactview");

    await user.type(within(form).getByLabelText(/my name is/i), "Jane");
    await user.type(within(form).getByLabelText(/reach me at/i), "jane@example.com");
    await user.type(within(form).getByLabelText(/wanted to say/i), "This is a real message.");
    await user.click(within(form).getByRole("button", { name: /seal & send/i }));

    expect(await within(form).findByRole("link", { name: /email me directly/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("App — command palette", () => {
  it("opens with Cmd+K, focuses the input, and closes on Escape restoring focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    editor.focus();

    await user.keyboard("{Meta>}k{/Meta}");
    const dialog = await screen.findByRole("dialog", { name: /command palette/i });
    expect(within(dialog).getByRole("combobox")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(editor).toHaveFocus();
  });

  it("searches and executes a transform command", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "make me shout");

    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "upper");

    const options = within(dialog).getAllByRole("option");
    expect(options[0]).toHaveTextContent(/uppercase/i);
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getEditor()).toHaveValue("MAKE ME SHOUT");
  });

  it("navigates to the command's own view first, then runs it there", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "Shout From Contact");

    const current = () =>
      screen.getByRole("button", { current: "page" }).textContent.trim();

    // Leave Write entirely.
    await user.click(screen.getByRole("button", { name: "Contact" }));
    await screen.findByRole("heading", { name: /say hello/i });
    expect(current()).toBe("Contact");

    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "upper");
    await user.keyboard("{Enter}");

    // The stage moved to Write and the transform ran there, on the text the
    // editor was still holding.
    await waitFor(() => expect(current()).toBe("Write"));
    await waitFor(() => expect(getEditor()).toHaveValue("SHOUT FROM CONTACT"));

    // A developer tool command routes to Developer and opens that tool.
    await user.keyboard("{Control>}k{/Control}");
    const dialog2 = await screen.findByRole("dialog");
    await user.type(within(dialog2).getByRole("combobox"), "base64");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(current()).toBe("Developer"));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /base64/i })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
  });

  it("keyboard-navigates the list and shows a run command under Recent", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "hello world");

    await user.keyboard("{Control>}k{/Control}");
    let dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "title");
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}"); // net: first option
    expect(getEditor()).toHaveValue("Hello World");

    await user.keyboard("{Control>}k{/Control}");
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Recent")).toBeInTheDocument();
  });

  it("shows an empty state for a non-matching query", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("combobox"), "zzzznope");
    expect(within(dialog).getByText(/no actions match/i)).toBeInTheDocument();
  });
});

describe("App — history panel", () => {
  it("restores an earlier checkpoint and keeps undo working", async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = getEditor();
    await user.type(editor, "one two");
    await user.click(screen.getByRole("button", { name: /^uppercase$/i }));
    await user.click(screen.getByRole("button", { name: /^title case$/i }));
    expect(editor).toHaveValue("One Two");

    await user.click(screen.getByRole("button", { name: /^history$/i }));
    const menu = await screen.findByRole("menu", { name: /history/i });
    await user.click(within(menu).getByRole("menuitem", { name: /uppercase/i }));
    expect(editor).toHaveValue("ONE TWO");

    // undo/redo still walk the stack around a restore
    await user.click(screen.getByRole("button", { name: /^redo$/i }));
    expect(editor).toHaveValue("One Two");
    await user.click(screen.getByRole("button", { name: /^undo$/i }));
    expect(editor).toHaveValue("ONE TWO");
  });
});

describe("App — copy", () => {
  it("reports copy success through the button label", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getEditor(), "copy this");

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await user.click(screen.getByRole("button", { name: /copy text to clipboard/i }));

    expect(writeText).toHaveBeenCalledWith("copy this");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
