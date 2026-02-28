import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { Pool } from "pg";
import dotenv from "dotenv";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

dotenv.config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

// OpenRouter helper function
async function callOpenRouter(model: string, prompt: string): Promise<string> {
    const response = await fetch(process.env.OPENROUTER_DOMAIN!, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are a database assistant. Always return ONLY valid JSON, no explanation, no markdown."
                },
                {
                    role: "user",
                    content: prompt
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
        choices: { message: { content: string } }[]
    };

    return data.choices[0].message.content;
}

const server = new McpServer({
    name: "Sample MCP Server",
    version: "1.0.0",
})

async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
}

// Tutorial 
server.resource(
    "user-list",
    "user://list",
    async () => {
        const result = await pool.query("SELECT * FROM users ORDER BY id");
        return {
            contents: [
                {
                    uri: "user://list",
                    mimeType: "application/json",
                    text: JSON.stringify(result.rows, null, 2)
                }
            ]
        };
    }
);

// Tutorial
server.resource(
    "user-details",
    new ResourceTemplate("user://{userId}/profile", {
        list: async () => {
            const result = await pool.query("SELECT id, name FROM users ORDER BY id");
            return {
                resources: result.rows.map(row => ({
                    uri: `user://${row.id}/profile`,
                    name: `User ${row.id} - ${row.name}`,
                    mimeType: "application/json",
                }))
            };
        }
    }),
    async (uri, { userId }) => {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error(`User ${userId} not found`);
        }

        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: "application/json",
                    text: JSON.stringify(result.rows[0], null, 2)
                }
            ]
        };
    }
);

// Fetch data user from database
server.tool("getUser", "Get a user", async () => {
    console.error("Fetching user list from database...");
    const res = await fetch("http://localhost:3000/user-list");
    const data = await res.json();

    return {
        content: [
            {
                type: "text",
                text: `Fetched ${data.length} users from the database.`
            }
        ]
    }
})

// Create random users using AI to local database
server.tool(
    "create-random-users",
    "Create random users in the database",
    {
        title: "Create User",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
    },
    async ({ model }) => {
        try {
            const selectedModel = model ?? "nvidia/nemotron-3-nano-30b-a3b:free";

            const aiResponse = await callOpenRouter(
                selectedModel,
                `Generate a fake user data. The user should have a realistic name, email, and address. Return the data in JSON format with keys: name, email, address or formatter so it can be used with JSON.parse.`
            );

            const cleaned = aiResponse.replace(/```json|```/g, "").trim();
            const fakeUser = JSON.parse(cleaned);

            const id = await createUser(fakeUser);

            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully created user with ID: ${id}`
                    }
                ]
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to generate user data`
                    }
                ]
            };
        }
    }
)

async function createUser(user: {
    name: string;
    email: string;
    address: string;
}) {
    const result = await pool.query(
        "INSERT INTO users (name, email, address) VALUES ($1, $2, $3) RETURNING id",
        [user.name, user.email, user.address]
    );
    return result.rows[0].id;
}



main()