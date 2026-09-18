import type { Player } from "./entities/Player.js"

export interface ShopItem {
  id: string
  name: string
  cost: number
  // One-time unlocks (abilities) shouldn't be re-buyable for no benefit —
  // stacking multipliers (boots, hookRange, regen) don't set this.
  once?: boolean
  apply: (player: Player) => void
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: "boots",
    name: "Бутси швидкості",
    cost: 50,
    apply: (player) => {
      player.speedMultiplier *= 1.15
    },
  },
  {
    id: "hookRange",
    name: "Подовжений гачок",
    cost: 60,
    apply: (player) => {
      player.hookRangeMultiplier *= 1.2
    },
  },
  {
    id: "regen",
    name: "Реген здоров'я",
    cost: 40,
    apply: (player) => {
      player.regenPerSecond += 2
    },
  },
  {
    id: "rot",
    name: "Гниль (E)",
    cost: 80,
    once: true,
    apply: (player) => {
      player.hasRot = true
    },
  },
]

export function findShopItem(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === itemId)
}
