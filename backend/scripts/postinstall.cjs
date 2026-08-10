const { execSync } = require("child_process");
const path = require("path");

const backendDir = path.resolve(__dirname, "..");
const prismaCli = path.join(backendDir, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
const prismaNode = path.join(backendDir, "node_modules", "prisma", "build", "index.js");

function run(command) {
    execSync(command, { cwd: backendDir, stdio: "inherit" });
}

function runPrisma(args) {
    try {
        run(`"${prismaCli}" ${args}`);
    } catch (_) {
        run(`node "${prismaNode}" ${args}`);
    }
}

runPrisma("generate");

if (process.env.VERCEL === "1" && process.env.DATABASE_URL) {
    runPrisma("migrate deploy");
}
