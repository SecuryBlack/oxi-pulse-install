/**
 * OxiPulse Install Worker
 *
 * Serves the correct install script based on the client's User-Agent:
 *   curl -fsSL https://install.oxipulse.dev | bash          → install.sh  (Linux/macOS)
 *   irm  https://install.oxipulse.dev | iex                 → install.ps1 (Windows)
 */

const REPO_RAW = "https://raw.githubusercontent.com/securyblack/oxi-pulse/main/scripts";

export default {
  async fetch(req) {
    const url = new URL(req.url);
    const ua = req.headers.get("User-Agent") ?? "";
    const isWindows = ua.includes("PowerShell") || ua.includes("WindowsPowerShell") || url.pathname.includes("windows") || url.pathname.endsWith(".ps1");

    const scriptFile = isWindows ? "install.ps1" : "install.sh";
    const githubUrl = `${REPO_RAW}/${scriptFile}?t=${Date.now()}`;

    const res = await fetch(githubUrl, {
      headers: { "User-Agent": "SecuryBlack-Installer-Worker" },
      cf: { cacheTtl: 0 }
    });

    const scriptText = await res.text();

    return new Response(scriptText, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
