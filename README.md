# OxiPulse Install Worker

Official Cloudflare Worker that dynamically serves the installation script for **OxiPulse** based on the client User-Agent and operating system:

- **Linux / macOS:** `curl -fsSL https://install.oxipulse.dev | sudo bash`
- **Windows (PowerShell):** `irm https://install.oxipulse.dev | iex`

## License

Apache-2.0 License.
