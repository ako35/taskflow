const { execSync } = require("child_process");
const path = require("path");

function run(command) {
    execSync(command, { stdio: "inherit" });
}

const prismaCli = path.join("node_modules", "prisma", "build", "index.js");

// Call Prisma via Node to avoid executable permission issues in some Vercel caches.
run(`node ${prismaCli} generate`);

if (process.env.VERCEL === "1") {
    run(`node ${prismaCli} migrate deploy`);
}
