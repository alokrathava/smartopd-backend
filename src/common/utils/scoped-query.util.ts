import { FindManyOptions, FindOneOptions } from 'typeorm';

export function scopedFind<T>(
  facilityId: string,
  extra: FindManyOptions<T> = {},
): FindManyOptions<T> {
  return {
    ...extra,
    where: {
      facilityId,
      ...(extra.where as object),
    } as any,
  };
}

export function scopedFindOne<T>(
  facilityId: string,
  extra: FindOneOptions<T> = {},
): FindOneOptions<T> {
  return {
    ...extra,
    where: {
      facilityId,
      ...(extra.where as object),
    } as any,
  };
}
