import 'dotenv/config';
import { EnvConfig } from './shared/config/EnvConfig';
import { Container } from './container';

const env = EnvConfig.load(process.env);
const container = new Container(env);
const port = env.get('PORT');

const server = container.getApp().listen(port, () => {
  console.log(`web-builder-api listening on http://localhost:${port}`);
});

const shutdown = (): void => {
  server.close(() => {
    void container.dispose().then(() => process.exit(0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
