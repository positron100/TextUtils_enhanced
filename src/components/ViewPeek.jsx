import "./ViewPeek.css";

/**
 * A static stand-in for a neighbouring view, shown sliding in from the edge
 * while the primary stage is being dragged — so the next section reads as
 * physically sitting beside the current one. Not the real view (those own
 * live refs / state); just its composition in silhouette.
 */
const LABELS = { write: "Write", developer: "Developer", typing: "Typing Speed", contact: "Contact" };

export default function ViewPeek({ view }) {
  return (
    <div className={`viewpeek viewpeek--${view}`} aria-hidden="true">
      <span className="viewpeek__kicker">{LABELS[view] ?? ""}</span>
      {view === "write" && (
        <div className="viewpeek__row">
          <div className="viewpeek__box viewpeek__box--tall" />
          <div className="viewpeek__box viewpeek__box--rail" />
        </div>
      )}
      {view === "developer" && (
        <>
          <div className="viewpeek__pills">
            {["a", "b", "c", "d"].map((k) => (
              <span key={k} className="viewpeek__pill" />
            ))}
          </div>
          <div className="viewpeek__row">
            <div className="viewpeek__box viewpeek__box--tall" />
            <div className="viewpeek__box viewpeek__box--tall" />
          </div>
        </>
      )}
      {view === "typing" && (
        <>
          <p className="viewpeek__title">Measure your pace.</p>
          <div className="viewpeek__row">
            <div className="viewpeek__box" />
            <div className="viewpeek__box" />
          </div>
        </>
      )}
      {view === "contact" && (
        <div className="viewpeek__row viewpeek__row--contact">
          <p className="viewpeek__title">Made by Mukul. Say hello.</p>
          <div className="viewpeek__box viewpeek__box--letter" />
        </div>
      )}
    </div>
  );
}
