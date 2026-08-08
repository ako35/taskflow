const { execSync } = require("child_process");
const path = require("path");

function run(command) {
    execSync(command, { stdio: "inherit" });
}

const prismaCli = path.join("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");

try {
    run(`"${prismaCli}" generate`);
} catch (_) {
    // Fall back to node invocation if the binary isn't executable yet
    const prismaNode = path.join("node_modules", "prisma", "build", "index.js");
    run(`node "${prismaNode}" generate`);
}

if (process.env.VERCEL === "1") {
    const prismaMigrate = path.join("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
    try {
        run(`"${prismaMigrate}" migrate deploy`);
    } catch (_) {
        const prismaNode = path.join("node_modules", "prisma", "build", "index.js");
        run(`node "${prismaNode}" migrate deploy`);
    }
}
