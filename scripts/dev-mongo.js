const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const HOST = "127.0.0.1";
const DEFAULT_PORT = Number(process.env.MONGO_PORT || 27017);
const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, "server", ".env");
const DB_PATH = path.join(ROOT_DIR, ".mongodb");
const LOG_PATH = path.join(DB_PATH, "mongod.log");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readEnvValue = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }

  if (!fs.existsSync(ENV_PATH)) {
    return "";
  }

  const line = fs
    .readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : "";
};

const localMongoTarget = (uri) => {
  if (!uri) {
    return { host: HOST, port: DEFAULT_PORT };
  }

  try {
    const parsed = new URL(uri);
    const hostname = parsed.hostname.toLowerCase();

    if (parsed.protocol !== "mongodb:" || !["localhost", "127.0.0.1"].includes(hostname)) {
      return null;
    }

    return {
      host: HOST,
      port: Number(parsed.port || DEFAULT_PORT)
    };
  } catch (_error) {
    return /^mongodb:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(uri)
      ? { host: HOST, port: DEFAULT_PORT }
      : null;
  }
};

const canConnect = ({ host, port }) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (connected) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });

const commandOutput = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  return result.status === 0 ? result.stdout.trim() : "";
};

const findMongod = () => {
  const configuredPath = process.env.MONGOD_PATH;
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const fromPath =
    process.platform === "win32" ? commandOutput("where.exe", ["mongod"]) : commandOutput("which", ["mongod"]);
  if (fromPath) {
    return fromPath.split(/\r?\n/)[0];
  }

  if (process.platform === "win32") {
    const installRoot = "C:\\Program Files\\MongoDB\\Server";
    if (fs.existsSync(installRoot)) {
      const versions = fs.readdirSync(installRoot).sort().reverse();
      for (const version of versions) {
        const candidate = path.join(installRoot, version, "bin", "mongod.exe");
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return "";
};

const keepAlive = () => {
  setInterval(() => {}, 1 << 30);
};

const start = async () => {
  const mongoUri = readEnvValue("MONGO_URI");
  const target = localMongoTarget(mongoUri);

  if (!target) {
    console.log("[mongo] MONGO_URI is remote, so local mongod startup is skipped.");
    keepAlive();
    return;
  }

  if (await canConnect(target)) {
    console.log(`[mongo] MongoDB is already reachable at mongodb://${target.host}:${target.port}`);
    keepAlive();
    return;
  }

  const mongodPath = findMongod();
  if (!mongodPath) {
    console.error("[mongo] Could not find mongod. Install MongoDB Community Server or set MONGOD_PATH.");
    process.exit(1);
  }

  fs.mkdirSync(DB_PATH, { recursive: true });

  const mongod = spawn(
    mongodPath,
    [
      "--dbpath",
      DB_PATH,
      "--bind_ip",
      target.host,
      "--port",
      String(target.port),
      "--logpath",
      LOG_PATH,
      "--logappend"
    ],
    {
      cwd: ROOT_DIR,
      stdio: ["ignore", "ignore", "inherit"]
    }
  );

  const stop = () => {
    if (!mongod.killed) {
      mongod.kill();
    }
  };

  process.once("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    stop();
    process.exit(0);
  });

  mongod.once("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[mongo] mongod exited with code ${code}. Check ${LOG_PATH}`);
      process.exit(code);
    }
  });

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    if (await canConnect(target)) {
      console.log(`[mongo] MongoDB started at mongodb://${target.host}:${target.port}`);
      return;
    }

    await sleep(500);
  }

  console.error(`[mongo] Timed out waiting for MongoDB. Check ${LOG_PATH}`);
  stop();
  process.exit(1);
};

start().catch((error) => {
  console.error("[mongo] Failed to start local MongoDB:", error.message);
  process.exit(1);
});
