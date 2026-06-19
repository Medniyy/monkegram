import fs from "node:fs";

const endpoint = process.argv[2] ?? "http://127.0.0.1:9222";
const outputDir = process.argv[3] ?? "store-submission/source-captures";

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
await wait(4000);

await evaluate(`(() => {
  const candidates = [...document.querySelectorAll("button")];
  const one = candidates.find((button) => button.textContent.trim() === "1");
  if (!one) throw new Error("Number 1 button not found");
  one.click();
  return true;
})()`);
await wait(2500);
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
