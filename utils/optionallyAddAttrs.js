export const optionallyAddAttrs = (args, attrs) =>
  attrs.reduce(
    (acc, cur) => ({
      ...acc,
      ...(args.hasOwnProperty(cur) && {
        [cur]: args[cur],
      }),
    }),
    {}
  );

export default optionallyAddAttrs;
