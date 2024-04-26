// Example: src/bot/middlewares/logging.ts
import { MiddlewareFn } from 'grammy';

export const loggingMiddleware: MiddlewareFn = async (ctx, next) => {
    console.log(`Handling update ${ctx.update.update_id}`);
    await next();
};
