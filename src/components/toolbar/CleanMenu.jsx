import Popover from "../ui/Popover.jsx";

const GROUP_ORDER = ["Whitespace", "Duplicate lines", "Sort", "Characters", "Normalize"];

/**
 * The full Clean toolkit behind one "More" button. Actions come from the
 * unified command registry (category "Clean"); the visual popover is shared
 * with History via <Popover>.
 */
export default function CleanMenu({ commands, onRun, disabled = false }) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: commands.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <Popover triggerLabel="More" menuLabel="More cleaning tools" disabled={disabled}>
      {(close) =>
        groups.map(({ group, items }) => (
          <div className="popover__group" key={group}>
            <p className="popover__grouplabel">{group}</p>
            {items.map((command) => (
              <button
                key={command.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="popover__item"
                onClick={() => {
                  close();
                  onRun(command);
                }}
              >
                {command.label}
              </button>
            ))}
          </div>
        ))
      }
    </Popover>
  );
}
