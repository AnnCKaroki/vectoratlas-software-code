/** Shared REST pagination shape (mirrors GraphQL PaginatedResponse). */
export type RestPaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
};

export type RestPaginationParams = {
  skip: number;
  take: number;
};

export const REST_PAGINATION_DEFAULT_TAKE = 20;
export const REST_PAGINATION_MAX_TAKE = 100;

/**
 * Parse skip/take from query strings. Defaults: skip=0, take=20 (capped at 100).
 */
export function parsePaginationQuery(
  skipRaw?: string | number,
  takeRaw?: string | number,
): RestPaginationParams {
  const parsedSkip = Number(skipRaw);
  const skip =
    Number.isFinite(parsedSkip) && parsedSkip >= 0
      ? Math.floor(parsedSkip)
      : 0;

  const parsedTake = Number(takeRaw);
  let take =
    Number.isFinite(parsedTake) && parsedTake >= 1
      ? Math.floor(parsedTake)
      : REST_PAGINATION_DEFAULT_TAKE;
  take = Math.min(REST_PAGINATION_MAX_TAKE, take);

  return { skip, take };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  skip: number,
  take: number,
): RestPaginatedResult<T> {
  return {
    items,
    total,
    hasMore: total > skip + take,
  };
}
