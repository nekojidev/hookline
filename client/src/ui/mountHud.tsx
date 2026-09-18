import { type Root, createRoot } from "react-dom/client"
import { Hud } from "./Hud.js"
import type { GameStateBridge } from "./gameStateBridge.js"

export function mountHud(
  container: HTMLElement,
  bridge: GameStateBridge,
  onBuy: (itemId: string) => void,
): Root {
  const root = createRoot(container)
  root.render(<Hud bridge={bridge} onBuy={onBuy} />)
  return root
}
