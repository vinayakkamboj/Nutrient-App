import { useCallback } from "react";
import type { NutrientToolbarAction } from "./toolbarBridge";
import { postToolbarUpdate } from "./toolbarBridge";

/**
 * Hook that turns tool results (structuredContent) into live toolbar updates in the widget iframe.
 */
export function useNutrientToolbarBridge(
  viewerIframeRef: React.RefObject<HTMLIFrameElement>,
  targetOrigin: string = "*"
) {
  return useCallback(
    (toolResult: any) => {
      const sc = toolResult?.structuredContent ?? toolResult?.data?.structuredContent;

      // Accept a few shapes depending on your Vercel template / SDK version
      const payload =
        (sc?.kind === "NUTRIENT_TOOLBAR" ? sc : null) ??
        (toolResult?.kind === "NUTRIENT_TOOLBAR" ? toolResult : null);

      if (!payload) return false;

      const action = payload.action as NutrientToolbarAction;
      const tools = Array.isArray(payload.tools) ? payload.tools : [];

      postToolbarUpdate(viewerIframeRef.current, action, tools, targetOrigin);
      return true;
    },
    [viewerIframeRef, targetOrigin]
  );
}
