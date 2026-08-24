import { useCallback, useState } from "react";

export function useLog(maxLines = 60): [string[], (msg: string) => void] {
  const [logs, setLogs] = useState<string[]>([]);
  const log = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, maxLines));
  }, [maxLines]);
  return [logs, log];
}
