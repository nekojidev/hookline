import { type Page, expect, test } from "@playwright/test"

// This is the closest thing to "two strangers duel live" achievable without
// a browser session I can actually watch — two independent browser
// contexts, real WebSocket traffic through the dockerized nginx + server
// stack, real keyboard/mouse input, recorded on video by Playwright itself.

async function joinAndReady(page: Page, name: string) {
  await page.goto("/")
  await expect(page.locator("#lobby-screen")).toBeVisible({ timeout: 10_000 })
  await page.locator("#player-name").fill(name)
  await page.locator("#join-room").click()
}

async function moveToward(
  page: Page,
  key: "KeyD" | "KeyA",
  durationMs: number,
) {
  await page.keyboard.down(key)
  await page.waitForTimeout(durationMs)
  await page.keyboard.up(key)
}

async function aimAndFire(page: Page, canvasX: number, canvasY: number) {
  const box = await page.locator("#game").boundingBox()
  if (!box) throw new Error("canvas not visible")
  await page.mouse.move(box.x + canvasX, box.y + canvasY)
  await page.mouse.down()
  await page.mouse.up()
}

test("recorded playthrough: two players join, approach, and hook each other", async ({
  browser,
}) => {
  // Manually created contexts don't inherit config's `use.video` the way
  // the default `page` fixture does — recordVideo has to be passed here
  // explicitly, and the file is only written out once the context closes.
  const contextA = await browser.newContext({
    recordVideo: {
      dir: "demo/videos/alice",
      size: { width: 960, height: 720 },
    },
  })
  const contextB = await browser.newContext({
    recordVideo: { dir: "demo/videos/bob", size: { width: 960, height: 720 } },
  })
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await joinAndReady(pageA, "Alice")
  await joinAndReady(pageB, "Bob")
  await expect(pageA.locator("#roster")).toContainText("Bob")

  await pageA.locator("#start-button").click()
  await pageB.locator("#start-button").click()
  await expect(pageA.locator("#game-screen")).toBeVisible({ timeout: 5_000 })
  await expect(pageB.locator("#game-screen")).toBeVisible({ timeout: 5_000 })
  await expect(pageA.locator(".hud")).toContainText("HP")

  // Whichever slot each browser landed in, both spawn on their own side and
  // walk toward the middle river — one moves right, the other left.
  await Promise.all([
    moveToward(pageA, "KeyD", 1800),
    moveToward(pageB, "KeyA", 1800),
  ])

  // Aim roughly at the middle of the arena, where they should now both be
  // close to, and fire. Not a guaranteed hit — it's a demo of live input
  // over the network, not a scripted animation.
  await aimAndFire(pageA, 520, 270)
  await pageA.waitForTimeout(600)
  await aimAndFire(pageB, 440, 270)
  await pageA.waitForTimeout(1000)

  await contextA.close()
  await contextB.close()
})
