"use client";

import { useEffect, useState } from "react";
import { SCRIPT_URLS, loadScript } from "@/app/_components/hand-tracking-utils";

export function useMediaPipeScripts(setStatus: (s: string) => void) {
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("Loading camera + hand tracking...");
        for (const scriptUrl of SCRIPT_URLS) {
          await loadScript(scriptUrl);
        }
        if (!cancelled) setScriptsReady(true);
      } catch {
        if (!cancelled) setStatus("Failed to load. Check internet and refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setStatus]);

  return scriptsReady;
}
