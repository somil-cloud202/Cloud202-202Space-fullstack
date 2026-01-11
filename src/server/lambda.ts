import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createTRPCHandler } from '@trpc/server/adapters/aws-lambda';
import { appRouter } from './trpc/root';

const trpcHandler = createTRPCHandler({
  router: appRouter,
  createContext: ({ event, context }) => ({
    event,
    context,
  }),
});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: '',
    };
  }

  // Handle tRPC requests
  if (event.path.startsWith('/trpc')) {
    return trpcHandler(event, context);
  }

  // Handle other API routes
  return {
    statusCode: 404,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: 'Not found' }),
  };
};
