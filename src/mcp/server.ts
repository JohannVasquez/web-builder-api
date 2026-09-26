import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ApiClient, ApiClientError } from './ApiClient';
import { buildTools, type McpTool } from './tools';

const readConfig = (source: NodeJS.ProcessEnv): { baseUrl: string; apiKey: string } => {
  const baseUrl = source.WEB_BUILDER_API_URL ?? 'http://localhost:4000';
  const apiKey = source.WEB_BUILDER_API_KEY ?? '';
  if (apiKey === '') {
    throw new Error(
      'Falta WEB_BUILDER_API_KEY. Genera una clave de acceso desde el panel y pásala como variable de entorno.',
    );
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
};

// Un error del agente se responde como contenido, no como excepción de transporte: así el
// agente lee el motivo, corrige y reintenta solo, en vez de ver "la herramienta falló".
const toToolResult = (value: unknown): { content: { type: 'text'; text: string }[] } => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

const toErrorResult = (
  error: unknown,
): { content: { type: 'text'; text: string }[]; isError: true } => {
  const message =
    error instanceof ApiClientError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Error desconocido.';
  return { content: [{ type: 'text', text: message }], isError: true };
};

export const createMcpServer = (tools: McpTool[]): McpServer => {
  const server = new McpServer({ name: 'web-builder', version: '1.0.0' });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args: Record<string, unknown>) => {
        try {
          return toToolResult(await tool.handler(args));
        } catch (error) {
          return toErrorResult(error);
        }
      },
    );
  }

  return server;
};

export const main = async (): Promise<void> => {
  const config = readConfig(process.env);
  const api = new ApiClient(config.baseUrl, config.apiKey);
  const server = createMcpServer(buildTools(api));
  await server.connect(new StdioServerTransport());
};
