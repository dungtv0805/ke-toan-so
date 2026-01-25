import type { ServiceResponse } from '../../interfaces';
import type { DoiTuongResponse } from '@app/dto';
import { ServiceClient } from '../../service-client';

export interface DoiTuongMethods {
  getDoiTuong(authToken?: string): Promise<ServiceResponse<DoiTuongResponse[]>>;
}

declare module '../../service-client' {
  interface ServiceMethods extends DoiTuongMethods {}
}

const SERVICE_NAME = 'master-data';

ServiceClient.prototype.getDoiTuong = async function (
  this: ServiceClient,
  authToken?: string,
): Promise<ServiceResponse<DoiTuongResponse[]>> {
  return this.get<DoiTuongResponse[]>(SERVICE_NAME, '/doi-tuong', {
    headers: authToken ? { Authorization: authToken } : undefined,
  });
};
