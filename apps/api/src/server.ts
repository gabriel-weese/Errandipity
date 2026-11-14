import { buildApp } from './app';

const port = Number(process.env.PORT ?? 3001);

buildApp()
  .listen({ port, host: '127.0.0.1' })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
