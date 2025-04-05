/**
 * Extracts field names from a GraphQL resolver info object.
 *
 * This function traverses the GraphQL query selection set and collects all
 * requested field names, including nested fields, into a flat array.
 *
 * @param info - GraphQL resolver info object containing query information
 * @returns Array of requested field names from the GraphQL query
 *
 * @example
 * // In a GraphQL resolver
 * resolve(parent, args, context, info) {
 *   const requestedFields = getRequestedFields(info);
 *   // ['id', 'name', 'address', 'city', 'zipcode']
 * }
 */
const getRequestedFields = (info): string[] => {
  if (!info || !info.fieldNodes) {
    return [];
  }

  const fields: string[] = [];

  const extractFieldNames = (selections) => {
    if (!selections) return;

    selections.forEach((selection) => {
      if (selection.kind === 'Field') {
        fields.push(selection.name.value);

        if (selection.selectionSet?.selections) {
          extractFieldNames(selection.selectionSet.selections);
        }
      }
    });
  };

  info.fieldNodes.forEach((fieldNode) => {
    if (fieldNode.selectionSet?.selections) {
      extractFieldNames(fieldNode.selectionSet.selections);
    }
  });

  return fields;
};

export default getRequestedFields;
