const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Starting CineBook GitHub Pages Static Export Build...");

const apiDir = path.join(__dirname, "../src/app/api");
const backupDir = path.join(__dirname, "../api_temp_stash");
const middlewareFile = path.join(__dirname, "../src/middleware.ts");
const middlewareBackup = path.join(__dirname, "../middleware_temp_stash.ts");
const outDir = path.join(__dirname, "../out");

let movedApi = false;
let movedMiddleware = false;

try {
  // 1. Temporarily move src/app/api and middleware out of the Next.js directory so static export succeeds
  if (fs.existsSync(apiDir)) {
    console.log("📦 Stashing backend API route handlers for static export...");
    fs.renameSync(apiDir, backupDir);
    movedApi = true;
  }

  if (fs.existsSync(middlewareFile)) {
    console.log("📦 Stashing middleware.ts for static export...");
    fs.renameSync(middlewareFile, middlewareBackup);
    movedMiddleware = true;
  }

  // 2. Run Next.js build with GitHub Pages environment
  console.log("⚡ Compiling Next.js static pages with basePath: /cineapp...");
  execSync("npx next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      DEPLOY_TARGET: "gh-pages",
      NEXT_PUBLIC_STATIC_EXPORT: "true",
      NEXT_PUBLIC_MOCK_API: "true",
    },
  });

  // 3. GitHub Pages SPA fallback: 404.html
  const indexHtml = path.join(outDir, "index.html");
  const notFoundHtml = path.join(outDir, "404.html");
  if (fs.existsSync(indexHtml)) {
    console.log("📄 Creating 404.html for GitHub Pages SPA routing fallback...");
    fs.copyFileSync(indexHtml, notFoundHtml);
  }

  // 4. GitHub Pages .nojekyll: prevents Jekyll from hiding _next assets
  console.log("🛡️  Creating .nojekyll to ensure GitHub Pages serves _next assets...");
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

  console.log("\n🎉 ========================================================");
  console.log("🎉 CINEBOOK GITHUB PAGES STATIC EXPORT COMPLETED!");
  console.log("🎉 Static bundle is ready in ./out for deployment to GitHub Pages.");
  console.log("🎉 ========================================================\n");
} catch (err) {
  console.error("❌ GitHub Pages build failed:", err);
  process.exit(1);
} finally {
  // Always restore API route handlers
  if (movedApi && fs.existsSync(backupDir)) {
    console.log("🔄 Restoring backend API route handlers...");
    fs.renameSync(backupDir, apiDir);
  }
  if (movedMiddleware && fs.existsSync(middlewareBackup)) {
    console.log("🔄 Restoring middleware.ts...");
    fs.renameSync(middlewareBackup, middlewareFile);
  }
}
