import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";

// The token is entered locally, hidden in the terminal, and never printed.
if (!process.stdin.isTTY)
  throw new Error("Run this command in your Mac terminal.");
process.stdout.write(
  "Paste your new Printify token (hidden), then press Return: ",
);
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
const token = await new Promise((resolveToken) => {
  let text = "";
  const handler = (chunk) => {
    for (const ch of chunk) {
      if (ch === "\u0003") process.exit(1);
      if (ch === "\r" || ch === "\n") {
        process.stdin.off("data", handler);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolveToken(text.trim());
        return;
      }
      if (ch === "\u007f") text = text.slice(0, -1);
      else if (ch >= " ") text += ch;
    }
  };
  process.stdin.on("data", handler);
  process.stdin.resume();
});
const response = await fetch("https://api.printify.com/v1/shops.json", {
  headers: {
    Authorization: `Bearer ${token}`,
    "User-Agent": "KamiKultureSetup/1.0",
  },
});
if (!response.ok)
  throw new Error(
    `Printify rejected this token (HTTP ${response.status}). No settings were changed.`,
  );
const envPath = resolve(import.meta.dirname, "../.env.local");
let contents = await readFile(envPath, "utf8").catch(() => "");
const lines = contents
  .split("\n")
  .filter((line) => !/^\s*PRINTIFY_API_TOKEN\s*=/.test(line));
lines.push(`PRINTIFY_API_TOKEN=${JSON.stringify(token)}`, "");
await writeFile(envPath, lines.join("\n"), { mode: 0o600 });
await chmod(envPath, 0o600);
console.log(
  "Printify token verified and saved in .env.local. Return to Codex and say done.",
);
