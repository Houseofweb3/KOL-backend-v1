import { Repository } from 'typeorm';
import { BaseModel } from '../utils/baseEntities/BaseModel';

export const updateTimestamp = async <T extends BaseModel>(repository: Repository<T>, entity: T): Promise<T> => {
  entity.updatedAt = new Date();
  return await repository.save(entity);
};
