import fs from "node:fs";

const endpoint = process.argv[2] ?? "http://127.0.0.1:9222";
const outputDir = process.argv[3] ?? "store-submission/source-captures";

// Which monke to feature in the captures. Defaults reproduce the original
// Gen2 #1 run; override for a specific token, e.g.:
//   MG_NUMBER=12677 MG_GEN=gen3 node scripts/capture-store-ui.mjs
const number = process.env.MG_NUMBER ?? "1";
const gen = (process.env.MG_GEN ?? "gen2").toLowerCase();

const target = await fetch(`${endpoint}/json/new?http://127.0.0.1:3000/monkegram/find/`, {
  method: "PUT",
}).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(expression) {
  return send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  fs.writeFileSync(`${outputDir}/${name}`, Buffer.from(result.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 432,
  height: 960,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 432,
  screenHeight: 960,
});
// Skip the first-visit stories tutorial so it can't cover the finder.
await evaluate(`localStorage.setItem("monkegram:onboarded","1")`);
await send("Page.reload");
await wait(4500);

// Pick the collection (Gen3 numbers run into 5 digits).
if (gen === "gen3") {
  await evaluate(`(() => {
    const tab = [...document.querySelectorAll('[role="tab"]')]
      .find((b) => /3/.test(b.textContent));
    if (!tab) throw new Error("Gen3 toggle not found");
    tab.click();
    return true;
  })()`);
  await wait(800);
}

// Type the number digit-by-digit on the numpad (exact-text match avoids the
// Gen3 toggle, which also contains a "3").
for (const digit of number.split("")) {
  await evaluate(`(() => {
    const key = [...document.querySelectorAll("button")]
      .find((b) => b.textContent.trim() === ${JSON.stringify(digit)});
    if (!key) throw new Error("Numpad key not found: " + ${JSON.stringify(digit)});
    key.click();
    return true;
  })()`);
  await wait(280);
}
// Let the NFT data load and the result card render.
await wait(4000);
await screenshot("find-result.png");

await evaluate(`(() => {
  const candidates = [...document.querySelectorAll("button")];
  const useButton = candidates.find((button) => /USE THIS/i.test(button.textContent));
  if (!useButton) throw new Error("Use this monke button not found");
  useButton.click();
  return true;
})()`);
await wait(7000);
await screenshot("record.png");

await send("Page.close");
socket.close();
