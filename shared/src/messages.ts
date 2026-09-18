import { z } from "zod"

// The type is derived from the schema (z.infer), not written twice —
// the schema is the single source of truth, so a validated message and its
// static type can never drift apart. This is the "runtime validation at
// boundaries" half of Lab 6: the server never trusts a client message's
// shape just because JSON.parse() didn't throw.
export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    roomId: z.string().optional(),
    name: z.string().min(1).max(24),
  }),
  z.object({ type: z.literal("chat"), text: z.string().min(1).max(280) }),
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("buyItem"), itemId: z.string() }),
])
export type ClientMessage = z.infer<typeof ClientMessageSchema>

const MemberSchema = z.object({ id: z.string(), name: z.string() })
const SlotSchema = z.union([z.literal(0), z.literal(1)])

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("joined"), you: MemberSchema }),
  z.object({ type: z.literal("system"), text: z.string() }),
  z.object({ type: z.literal("roster"), members: z.array(MemberSchema) }),
  z.object({ type: z.literal("chat"), from: z.string(), text: z.string() }),
  z.object({ type: z.literal("matchStart"), yourSlot: SlotSchema }),
  z.object({
    type: z.literal("buyResult"),
    ok: z.boolean(),
    reason: z.string().optional(),
  }),
])
export type ServerMessage = z.infer<typeof ServerMessageSchema>
