// @ts-ignore
import FastifyVite from '@fastify/vite';
import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { createYoga } from 'graphql-yoga';
import { renderToString } from 'react-dom/server';

import { builder } from '~/builder';
import * as client from '~/client';
import { clientPath, entryPath } from '~/common';
import { type Context, makeContextFactory } from '~/context';

export async function makeApp(options: {
  dev: boolean;
}) {
  const app = fastify({
    logger: options.dev
      ? {
          transport: {
            target: 'pino-pretty',
          },
          level: 'debug',
        }
      : true,
  });

  await setupYoga(app);
  await setupClient(app);

  return app;
}

async function setupYoga(app: FastifyInstance) {
  const graphQLServer = createYoga<
    {
      req: FastifyRequest;
      reply: FastifyReply;
    },
    Context
  >({
    context: makeContextFactory({ logger: app.log }),
    schema: builder.toSchema(),
    logging: {
      debug: (...args) => args.forEach((arg) => app.log.debug(arg)),
      info: (...args) => args.forEach((arg) => app.log.info(arg)),
      warn: (...args) => args.forEach((arg) => app.log.warn(arg)),
      error: (...args) => args.forEach((arg) => app.log.error(arg)),
    },
  });

  app.addContentTypeParser('multipart/form-data', {}, (req, payload, done) => done(null));

  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: async (req, reply) => {
      const response = await graphQLServer.handleNodeRequest(req, { req, reply });
      for (const [name, value] of response.headers) {
        reply.header(name, value);
      }
      reply.status(response.status);
      reply.send(response.body);
      return reply;
    },
  });
}

async function setupClient(app: FastifyInstance) {
  await app.register(FastifyVite, {
    dev: import.meta.env.DEV,
    client,
    clientPath,
    entryPath,
    // rome-ignore lint/suspicious/noExplicitAny: @fastify/vite doesn't provide type definitions
    createRenderFunction({ createApp }: any) {
      return () => {
        return {
          element: renderToString(createApp()),
        };
      };
    },
  });

  app.get('/', (req, reply) => {
    // @ts-ignore
    reply.html(reply.render());
  });

  // @ts-ignore
  await app.vite.ready();
}
