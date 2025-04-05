/**
 * Checks if a variable is a non-null, non-array object
 *
 * @param variable - The variable to check
 * @returns boolean - True if the variable is an object (not array or null)
 */
export const isObject = (variable) =>
  typeof variable === 'object' && !Array.isArray(variable) && variable !== null;

/**
 * Transforms MongoDB populated results to maintain both ID references and populated objects
 *
 * For each populated field (e.g. "user" with "userId"), this function:
 * - Preserves the original ID in the ID field (e.g. userId contains the ID)
 * - Places the populated object in a field matching the base name (e.g. user contains the user object)
 *
 * @param result - The query result object with populated fields
 * @param possiblePopulatedFields - Array of field base names that might be populated
 * @returns Object with both IDs and populated objects correctly placed
 */
const restore = (result, possiblePopulatedFields) => ({
  ...result,
  ...possiblePopulatedFields.reduce(
    (acc, cur) => ({
      ...acc,
      ...(isObject(result[`${cur}Id`]) && {
        [`${cur}Id`]: result[`${cur}Id`]._id,
        [cur]: result[`${cur}Id`],
      }),
    }),
    {}
  ),
});

/**
 * Intelligently populates MongoDB references based on GraphQL query fields
 *
 * This function:
 * 1. Analyzes the GraphQL query to determine which fields were requested
 * 2. Only populates references for fields that were actually requested
 * 3. Maintains both the ID reference and the populated object
 * 4. Works with both single objects and arrays of results
 * 5. Handles special cases like newly created documents
 *
 * @param query - MongoDB query object (find, findOne, etc.)
 * @param info - GraphQL resolver info object containing the query details
 * @param possiblePopulatedFields - Array of field names that can be populated (e.g. ['user', 'post'])
 * @returns The query results with requested fields populated
 *
 * @example
 * // In a GraphQL resolver:
 * const post = await populate(
 *   PostModel.findById(id),
 *   info,
 *   ['author', 'comments']
 * );
 */
const populate = async (query, info, possiblePopulatedFields) => {
  const fieldsToPopulate: string[] = [];

  // check if we should populate the user attribute
  possiblePopulatedFields.forEach((possiblePopulatedField) => {
    const shouldPopulateField = info.fieldNodes[0].selectionSet.selections.some(
      (field) => field.name.value === possiblePopulatedField
    );

    if (shouldPopulateField) {
      fieldsToPopulate.push(possiblePopulatedField);
    }
  });

  let results;

  try {
    results = await query
      .populate(fieldsToPopulate.map((field) => `${field}Id`))
      .lean();
  } catch {
    // this is used for .create() that has no populate method
    results = await query;
    results = await results.populate(
      fieldsToPopulate.map((field) => `${field}Id`)
    );
    results = results.toObject();
  }

  // populate the possiblePopulatedFields attribute and restore the "originalId"
  if (results) {
    if (Array.isArray(results)) {
      if (results.length > 0) {
        results = results.map((result) =>
          restore(result, possiblePopulatedFields)
        );
      }
    } else {
      results = restore(results, possiblePopulatedFields);
    }
  }

  return results;
};

export default populate;
