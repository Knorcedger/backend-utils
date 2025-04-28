import { GraphQLObjectType } from 'graphql';

interface RemoveFieldFromTypeOptions {
  fieldName: string;
  type: GraphQLObjectType;
}

/**
 * Removes a field from an existing GraphQLObjectType.
 * Note: Modifies the type in place by removing from the fields map.
 * @param options Options object containing the field name to remove and the target type.
 * @returns boolean Indicates whether the field was successfully removed.
 */
export const removeFieldFromType = ({
  fieldName,
  type,
}: RemoveFieldFromTypeOptions): boolean => {
  // Type guard
  if (!(type instanceof GraphQLObjectType)) {
    console.error('Cannot remove field: Target type is not a GraphQLObjectType.');
    return false;
  }

  // Validate field name
  if (!fieldName) {
    console.error('Cannot remove field: Field name must be provided.');
    return false;
  }

  // Get the public fields map
  const fields = type.getFields();

  if (!fields[fieldName]) {
    console.warn(`Field "${fieldName}" does not exist on type "${type.name}".`);
    return false;
  }

  // Delete the field from the fields map
  delete fields[fieldName];

  // Verify the field was removed
  const updatedFields = type.getFields();
  if (!(fieldName in updatedFields)) {
    // console.log(`Successfully removed field "${fieldName}" from type "${type.name}".`);
    return true;
  } else {
    console.error(
      `Failed to remove field "${fieldName}" from type "${type.name}". Modification might not be reflected.`
    );
    return false;
  }
};
