/**
 * OxiPulse Install Worker
 *
 * Serves the correct install script based on the client's User-Agent or path:
 *   curl -fsSL https://install.oxipulse.dev | bash          → install.sh  (Linux/macOS)
 *   irm  https://install.oxipulse.dev | iex                 → install.ps1 (Windows)
 */

const REPO_RAW = "https://raw.githubusercontent.com/securyblack/oxi-pulse/main/scripts";

export default {
  async fetch(req) {
    try {
      const url = new URL(req.url);
      const ua = req.headers.get("User-Agent") ?? "";
      
      const isWindows = ua.includes("PowerShell") || 
                        ua.includes("WindowsPowerShell") || 
                        url.pathname.includes("windows") || 
                        url.pathname.endsWith(".ps1");

      const scriptFile = isWindows ? "install.ps1" : "install.sh";
      const githubUrl = `${REPO_RAW}/${scriptFile}`;

      const res = await fetch(githubUrl, {
        headers: { "User-Agent": "SecuryBlack-Installer-Worker" },
        cf: { cacheTtl: 60 }
      });

      if (!res.ok) {
        return new Response(`# Error: Failed to fetch installer script from GitHub (HTTP ${res.status})\n`, {
          status: 502,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      let scriptText = await res.text();

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

