const pagination = (limit, offset, query) => {
  if (limit) {
    if (limit > 0 && limit <= 20) {
      query.limit(limit);
    } else {
      throw new Error('Invalid limit');
    }
  }

  if (offset) {
    if (offset >= 0) {
      query.skip(offset);
    } else {
      throw new Error('Invalid offset');
    }
  }

  return query;
};

export { pagination };
