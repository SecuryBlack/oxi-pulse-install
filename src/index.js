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
    const ua = req.headers.get("User-Agent") ?? "";
    const isWindows = ua.includes("PowerShell") || ua.includes("WindowsPowerShell");

    const scriptUrl = isWindows
      ? `${REPO_RAW}/install.ps1`
      : `${REPO_RAW}/install.sh`;

    const response = await fetch(scriptUrl);

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": isWindows ? "text/plain; charset=utf-8" : "text/x-sh; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  },
};
