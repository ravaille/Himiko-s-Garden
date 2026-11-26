// Zippe le contenu de dist/ (index.html à la racine du zip) pour l'upload manuel sur itch.io.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

if (!existsSync("dist/index.html")) {
  console.error("dist/ introuvable : lance d'abord `npm run build`.");
  process.exit(1);
}
rmSync("himikos-garden-web.zip", { force: true });
if (process.platform === "win32") {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path dist/* -DestinationPath himikos-garden-web.zip"`,
    { stdio: "inherit" },
  );
} else {
  execSync("cd dist && zip -r ../himikos-garden-web.zip .", { stdio: "inherit" });
}
console.log("Créé : himikos-garden-web.zip (à uploader sur itch.io, type HTML).");
