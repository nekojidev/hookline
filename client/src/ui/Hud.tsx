import { SHOP_ITEMS } from "hookline-shared/src/shop.js"
import { useSyncExternalStore } from "react"
import type { GameStateBridge } from "./gameStateBridge.js"

export interface HudProps {
  bridge: GameStateBridge
  onBuy: (itemId: string) => void
}

export function Hud({ bridge, onBuy }: HudProps) {
  const state = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot)

  if (!state.visible) return null

  if (state.respawnRemaining > 0) {
    return (
      <div className="hud hud-dead">
        <span>Вас вбили гачком</span>
        <span>Відродження через {Math.ceil(state.respawnRemaining)}с</span>
      </div>
    )
  }

  return (
    <div className="hud">
      <div className="hud-stats">
        <span>HP: {Math.round(state.health)}</span>
        <span>Золото: {state.gold}</span>
        <span>
          Гачок:{" "}
          {state.hookCooldownRemaining > 0
            ? `${state.hookCooldownRemaining.toFixed(1)}с`
            : "готовий"}
        </span>
        {state.hasRot && (
          <span>
            Гниль (E):{" "}
            {state.rotCooldownRemaining > 0
              ? `${state.rotCooldownRemaining.toFixed(1)}с`
              : "готова"}
          </span>
        )}
      </div>
      <div className="shop">
        {SHOP_ITEMS.map((item) => {
          const alreadyOwned = item.once && item.id === "rot" && state.hasRot
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onBuy(item.id)}
              disabled={alreadyOwned || state.gold < item.cost}
            >
              {alreadyOwned
                ? `${item.name} ✓`
                : `${item.name} — ${item.cost}💰`}
            </button>
          )
        })}
      </div>
      {state.buyMessage && (
        <div className="buy-message">{state.buyMessage}</div>
      )}
    </div>
  )
}
