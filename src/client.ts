import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";


const mcp = new Client({
    name: "automated-agent",
    version: "1.0.0",
}, {
    capabilities: { sampling: {} }
})

const transport = new StdioClientTransport({
    command: "node",
    args: ["build/server.js"],
    stderr: "ignore"
})

async function main() {
    await mcp.connect(transport)
    const [{ tools }, { prompts }, { resources }, { resourceTemplates }] =
        await Promise.all([
            mcp.listTools(),
            mcp.listPrompts(),
            mcp.listResources(),
            mcp.listResourceTemplates()
        ])
}

main()
