import 'dotenv/config';
import { main } from './server';

main().catch((error: unknown) => {
  // stderr y no stdout: stdout es el canal del protocolo MCP.
  console.error('[web-builder-mcp]', error);
  process.exitCode = 1;
});
