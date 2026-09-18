import { expect, test } from "@playwright/test"

// Two independent browser contexts — not two tabs sharing state — so this
// genuinely exercises the network path (WebSocket join/chat/ready/binary
// snapshots) rather than anything client-local.
test("two players join, chat, and start a match together", async ({
  browser,
}) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto("/")
  await pageB.goto("/")

  // The loading screen must finish (fetch + decodeAudioData for every
  // asset) before the lobby appears.
  await expect(pageA.locator("#lobby-screen")).toBeVisible({ timeout: 10_000 })
  await expect(pageB.locator("#lobby-screen")).toBeVisible({ timeout: 10_000 })

  await pageA.locator("#player-name").fill("Alice")
  await pageB.locator("#player-name").fill("Bob")
  await pageA.locator("#join-room").click()
  await pageB.locator("#join-room").click()

  await expect(pageA.locator("#roster")).toContainText("Alice")
  await expect(pageA.locator("#roster")).toContainText("Bob")
  await expect(pageB.locator("#roster")).toContainText("Alice")
  await expect(pageB.locator("#roster")).toContainText("Bob")

  await pageA.locator("#chat-input").fill("привіт!")
  await pageA.locator("#chat-form button[type=submit]").click()
  await expect(pageB.locator("#chat-log")).toContainText("Alice: привіт!")

  await pageA.locator("#start-button").click()
  await pageB.locator("#start-button").click()

  await expect(pageA.locator("#game-screen")).toBeVisible({ timeout: 5_000 })
  await expect(pageB.locator("#game-screen")).toBeVisible({ timeout: 5_000 })

  // The React HUD only renders once PlayingState.enter() mounts it —
  // seeing it confirms the server actually paired the two clients and sent
  // matchStart to both, not just that the canvas is technically visible.
  await expect(pageA.locator(".hud")).toContainText("HP")
  await expect(pageB.locator(".hud")).toContainText("HP")

  await contextA.close()
  await contextB.close()
})
