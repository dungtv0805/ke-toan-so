import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RequestContext {
  private static als = new AsyncLocalStorage<Request>();

  static run(req: Request, callback: () => void) {
    RequestContext.als.run(req, callback);
  }

  static getRequest(): Request | undefined {
    return RequestContext.als.getStore();
  }
}
