import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    const data = parsed.data as {
      body?: Request['body'];
      params?: Request['params'];
      query?: Request['query'];
    };

    if (data.body) req.body = data.body;
    if (data.params) req.params = data.params;
    if (data.query) req.query = data.query;

    next();
  };

export default validate;
