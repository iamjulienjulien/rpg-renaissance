// scripts/setVersion.js
const { execSync } = require("child_process");
const fs = require("fs");

const ENV_PATH = ".env.local";
const KEYS = ["NEXT_PUBLIC_APP_VERSION"];

function getGitVersion() {
    try {
        const msg = execSync("git log -1 --pretty=%B").toString().trim().replace(/\s+/g, " "); // une seule ligne

        return msg.slice(0, 6) || "";
    } catch {
        return "";
    }
}

function readEnv() {
    if (!fs.existsSync(ENV_PATH)) return "";
    return fs.readFileSync(ENV_PATH, "utf8");
}

function stripManagedKeys(env) {
    return env
        .split("\n")
        .filter((line) => !KEYS.some((k) => line.startsWith(k + "=")))
        .join("\n")
        .trim();
}

const version = getGitVersion();

const existing = readEnv();
const cleaned = stripManagedKeys(existing);

// Ajout dans le script
const injected = `NEXT_PUBLIC_APP_VERSION=${version}`.trim();

const finalEnv = (cleaned ? cleaned + "\n" : "") + injected;

fs.writeFileSync(ENV_PATH, finalEnv);

console.log("✔ App version injected safely:", version);
