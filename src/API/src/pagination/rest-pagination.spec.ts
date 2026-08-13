import {
  REST_PAGINATION_DEFAULT_TAKE,
  REST_PAGINATION_MAX_TAKE,
  parsePaginationQuery,
  toPaginatedResult,
} from './rest-pagination';

describe('rest-pagination', () => {
  describe('parsePaginationQuery', () => {
    it('defaults to skip 0 and take 20', () => {
      expect(parsePaginationQuery()).toEqual({
        skip: 0,
        take: REST_PAGINATION_DEFAULT_TAKE,
      });
    });

    it('parses numeric strings and caps take at max', () => {
      expect(parsePaginationQuery('5', '999')).toEqual({
        skip: 5,
        take: REST_PAGINATION_MAX_TAKE,
      });
    });

    it('falls back for invalid values', () => {
      expect(parsePaginationQuery('abc', '-1')).toEqual({
        skip: 0,
        take: REST_PAGINATION_DEFAULT_TAKE,
      });
    });
  });

  describe('toPaginatedResult', () => {
    it('computes hasMore from total vs skip+take', () => {
      expect(toPaginatedResult(['a'], 21, 0, 20).hasMore).toBe(true);
      expect(toPaginatedResult(['a'], 20, 0, 20).hasMore).toBe(false);
    });
  });
});
