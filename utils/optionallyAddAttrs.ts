/**
 * Selectively copies properties from a source object based on a list of attribute names.
 *
 * @param args - Source object containing potential properties to be copied
 * @param attrs - Array of attribute names to look for in the source object
 * @returns A new object containing only the properties from `args` that are listed in `attrs`
 *
 * @example
 * ```typescript
 * const user = { id: 1, name: 'John', age: 30, active: true };
 * const allowedAttrs = ['name', 'age', 'email'];
 * const result = optionallyAddAttrs(user, allowedAttrs);
 * // result = { name: 'John', age: 30 }
 * ```
 */
export const optionallyAddAttrs = <T extends Record<string, any>>(
  args: T,
  attrs: string[]
): Partial<Pick<T, Extract<keyof T, string>>> =>
  attrs.reduce(
    (acc, cur) => ({
      ...acc,
      ...(Object.hasOwn(args, cur) && {
        [cur]: args[cur],
      }),
    }),
    {}
  );

export default optionallyAddAttrs;
