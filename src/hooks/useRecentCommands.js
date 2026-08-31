import { useCallback, useState } from "react";

/** Most-recently-run command ids, newest first, de-duplicated, in memory only. */
export function useRecentCommands(limit = 6) {
  const [recentIds, setRecentIds] = useState([]);

  const record = useCallback(
    (id) => {
      setRecentIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, limit));
    },
    [limit],
  );

  return { recentIds, record };
}
