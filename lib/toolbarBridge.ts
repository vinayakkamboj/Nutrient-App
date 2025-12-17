export type NutrientToolbarAction = "remove" | "add" | "keep_only" | "reset" | "get";

export type NutrientToolbarPayload = {
  type: "NUTRIENT_TOOLBAR";
  action: NutrientToolbarAction;
  tools?: string[];
};

/**
 * Send a toolbar update to the Nutrient PDF widget iframe.
 *
 * IMPORTANT: You must pass the iframe element that contains the widget HTML.
 */
export function postToolbarUpdate(
  iframe: HTMLIFrameElement | null,
  action: NutrientToolbarAction,
  tools: string[] = [],
  targetOrigin: string = "*"
) {
  const win = iframe?.contentWindow;
  if (!win) return;

  const payload: NutrientToolbarPayload = { type: "NUTRIENT_TOOLBAR", action, tools };
  win.postMessage(payload, targetOrigin);
}
