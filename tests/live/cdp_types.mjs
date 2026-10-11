// 3T Sheet data-entry type detection on the desktop app via CDP.
const port = process.argv[2] || "9380";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = [];
for (let i = 0; i < 90; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    if (targets.some((t) => t.type === "page")) break;
  } catch {}
  await sleep(1000);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evalJs = async (expr) =>
  (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const keyEv = async (key, vk, text, mods = 0) => {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    windowsVirtualKeyCode: vk,
    text,
    unmodifiedText: text,
    modifiers: mods,
  });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, windowsVirtualKeyCode: vk, modifiers: mods });
  await sleep(50);
};
const type = async (s) => {
  for (const ch of s)
    await keyEv(ch, /[a-z0-9]/i.test(ch) ? ch.toUpperCase().charCodeAt(0) : 0, ch);
  await sleep(200);
};
const enter = async () => {
  await keyEv("Enter", 13, "\r");
  await sleep(300);
};

for (let i = 0; i < 60 && !(await evalJs(`!!document.querySelector('[data-coord="A1"]')`)); i++) await sleep(500);
await sleep(2500);
if (await evalJs(`!!document.querySelector('.vno-dialog-overlay, [role=dialog]')`)) {
  await keyEv("Escape", 27, "");
  await sleep(600);
}
const q = await evalJs(
  `(() => { const r = document.querySelector('[data-coord="A1"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`
);
for (const t of ["mousePressed", "mouseReleased"])
  await send("Input.dispatchMouseEvent", { type: t, x: q.x, y: q.y, button: "left", clickCount: 1 });
await sleep(300);

const inputs = ["1234.56", "31/12/2026", "13:45", "25%", "₫250000", "'0123", "abc"];
for (const v of inputs) {
  await type(v);
  await enter();
}
// Alt+Enter in A8
await type("Dong1");
await keyEv("Enter", 13, "", 1 /* Alt */);
await type("Dong2");
await enter();

// Additional numeric inputs: 1,234.56, -1234.56, 1234, 0.5 in A9..A12
const moreNumeric = ["1,234.56", "-1234.56", "1234", "0.5"];
for (const v of moreNumeric) {
  await type(v);
  await enter();
}

const cells = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12"];
const out = await evalJs(
  `(() => ${JSON.stringify(cells)}.map(c => { const el = document.querySelector('[data-coord="' + c + '"]'); return c + "=" + JSON.stringify(el?.innerText) + " align=" + (el ? getComputedStyle(el).textAlign + "/" + getComputedStyle(el).justifyContent : "?"); }))()`
);
console.log(out.join("\n"));
ws.close();
