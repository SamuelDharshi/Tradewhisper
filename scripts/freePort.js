const killPort = require("kill-port");

const raw = process.argv[2];
const port = Number(raw || 3000);

if (!Number.isFinite(port) || port <= 0) {
  process.exit(0);
}

killPort(port)
  .catch(() => {
    // Ignore when no process is using the port.
  })
  .finally(() => {
    process.exit(0);
  });
