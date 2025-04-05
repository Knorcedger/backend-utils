import { GraphQLScalarType, Kind } from 'graphql';

interface TypesStorage {
  IntRangeType: {
    max: number;
    min: number;
    type: GraphQLScalarType;
  }[];
}

// we save the types in memory to avoid creating them multiple times
const typesStorage: TypesStorage = {
  IntRangeType: [],
};

/**
 * Creates or retrieves a GraphQL scalar type that validates integers within a specified range.
 *
 * This function checks if a scalar type with the same range constraints already exists in the
 * type storage. If found, it returns the existing type to avoid duplication. Otherwise,
 * it creates a new GraphQL scalar type that validates integers to ensure they fall within
 * the specified minimum and maximum values (inclusive).
 *
 * @param min - The minimum allowed integer value (inclusive)
 * @param max - The maximum allowed integer value (inclusive)
 * @returns A GraphQL scalar type that validates integers within the specified range
 *
 * @example
 * // Create a type that only accepts integers between 1 and 10
 *
 * // Use in a GraphQL schema
 * const schema = new GraphQLSchema({
 *   query: new GraphQLObjectType({
 *     fields: {
 *       rating: { type: IntRangeType(1, 10) },
 *     }
 *   })
 * });
 */
export const IntRangeType = (min, max) => {
  const existingType = typesStorage.IntRangeType.find(
    (type) => type.min === min && type.max === max
  );
  if (existingType) {
    return existingType.type;
  } else {
    const newType = new GraphQLScalarType({
      description: 'An integer between min and max',
      name: `IntRangeType${min}_${max}`,
      parseLiteral: (ast) => {
        if (ast.kind !== Kind.INT) {
          throw new Error('Expected an integer value');
        }
        const v = parseInt((ast as any).value, 10);
        if (v > max || v < min) {
          throw new Error(`Value must be between ${min} and ${max}`);
        }
        return v;
      },
      parseValue: (v) => v,
    });

    typesStorage.IntRangeType.push({ max, min, type: newType });
    return newType;
  }
};
