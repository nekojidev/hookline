export const ARENA = {
  width: 960,
  height: 540,
}

export const RIVER = {
  x: ARENA.width / 2 - 40,
  width: 80,
}

export const TREE_Y_POSITIONS = [60, 150, 270, 390, 480]

export const FIXED_STEP = 1 / 50

// movement — shared between client prediction and server authority so the
// two never disagree about how an input turns into motion
export const ACCELERATION = 900 // px/s^2
export const FRICTION = 6 // exponential damping per second
export const MAX_SPEED = 220 // px/s

// hook
export const HOOK_SPEED = 700 // px/s while flying
export const HOOK_MAX_RANGE = 480 // px
export const HOOK_COOLDOWN = 1.5 // s, starts counting the moment the hook is fired
export const PULL_SPEED = 900 // px/s, how fast the target is reeled in
export const RELEASE_DISTANCE = 34 // px, close enough to the owner to let go
export const TREE_DAMAGE = 15
export const GOLD_PER_HOOK_HIT = 25

// Reeled all the way in to the owner = dead, matching Pudge Wars ("given to
// the butcher") — not just damage. A finite large number, not Infinity:
// Player.takeDamage() clamps via Math.max(0, health - amount), and
// Infinity - anything is still Infinity, which would never clamp to 0.
export const HOOK_KILL_DAMAGE = 999
export const RESPAWN_DELAY = 3 // seconds

// Rot — Pudge's actual second ability, not another passive stat tweak: an
// AoE damage aura around the caster, toggled on for a few seconds at a
// time. Bought once from the shop, then triggered on demand like the hook.
export const ROT_COOLDOWN = 6 // s
export const ROT_DURATION = 2.5 // s
export const ROT_RADIUS = 70 // px
export const ROT_DAMAGE_PER_SECOND = 20
