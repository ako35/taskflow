const { execSync } = require("child_process");

function run(command) {
    execSync(command, { stdio: "inherit" });
}

run("npx prisma generate");

if (process.env.VERCEL === "1") {
    run("npx prisma migrate deploy");
}
