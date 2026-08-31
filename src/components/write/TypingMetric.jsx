/** A single typing metric — value large and dominant, label quiet beneath. */
export default function TypingMetric({ value, label }) {
  return (
    <div className="typingmetric">
      <span className="typingmetric__value">{value}</span>
      <span className="typingmetric__label">{label}</span>
    </div>
  );
}
