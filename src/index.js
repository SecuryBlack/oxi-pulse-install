/**
 * OxiPulse Install Worker
 *
 * Serves the correct install script based on the client's User-Agent or path:
 *   curl -fsSL https://install.oxipulse.dev | bash          → install.sh  (Linux/macOS)
 *   irm  https://install.oxipulse.dev | iex                 → install.ps1 (Windows)
 */

const REPOS = [
  "https://raw.githubusercontent.com/securyblack/oxi-pulse/main/scripts",
  "https://raw.githubusercontent.com/securyblack/oxi-pulse/master/scripts",
];

// Install counter: one data point per script served, without IP or identifiers.
// Browsers are people reading the script; curl/wget/PowerShell are installs.
function countInstall(env, req, scriptFile) {
  try {
    const ua = req.headers.get("User-Agent") ?? "";
    const client = /PowerShell/i.test(ua) ? "powershell"
      : /^curl\//i.test(ua) ? "curl"
      : /^Wget\//i.test(ua) ? "wget"
      : /Mozilla/i.test(ua) ? "browser"
      : "other";
    env.INSTALLS?.writeDataPoint({
      indexes: [scriptFile],
      blobs: [scriptFile, client, req.cf?.country ?? ""],
      doubles: [1],
    });
  } catch {
    // Counting must never break the installer.
  }
}

export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      const ua = req.headers.get("User-Agent") ?? "";
      
      const isWindows = ua.includes("PowerShell") || 
                        ua.includes("WindowsPowerShell") || 
                        url.pathname.includes("windows") || 
                        url.pathname.endsWith(".ps1");

      const scriptFile = isWindows ? "install.ps1" : "install.sh";
      
      let res = null;
      for (const repoUrl of REPOS) {
        const githubUrl = `${repoUrl}/${scriptFile}`;
        const attempt = await fetch(githubUrl, {
          headers: { "User-Agent": "SecuryBlack-Installer-Worker" },
          cf: { cacheTtl: 60 },
        });
        if (attempt.ok) {
          res = attempt;
          break;
        }
      }

      if (!res) {
        return new Response(`# Error: Failed to fetch installer script from GitHub\n`, {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      let scriptText = await res.text();
      countInstall(env, req, scriptFile);

      if (isWindows) {
        const winHeader = `# SecuryBlack Windows Compatibility (Windows Server 2019+ / PowerShell 5.1)\r\n[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls\r\nSet-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue\r\n\r\n`;
        if (!scriptText.includes("[Net.ServicePointManager]::SecurityProtocol")) {
          scriptText = winHeader + scriptText;
        }
      }

      return new Response(scriptText, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=60",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(`# Error: Internal installer worker error\n# ${err.message || err}\n`, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};
