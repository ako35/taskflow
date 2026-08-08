const { execSync } = require("child_process");
const path = require("path");

function run(command) {
    execSync(command, { stdio: "inherit" });
}

const prismaCli = path.join("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");

try {
    run(`"${prismaCli}" generate`);
} catch (_) {
    const prismaNode = path.join("node_modules", "prisma", "build", "index.js");
    run(`node "${prismaNode}" generate`);
}
