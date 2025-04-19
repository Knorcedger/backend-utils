import type { GraphQLFieldConfig, GraphQLOutputType } from 'graphql';

import { GraphQLObjectType, isOutputType } from 'graphql';

interface AddFieldToTypeOptions {
  field: { name: string } & GraphQLFieldConfig<any, any>; // Add name property to the field type
  type: GraphQLOutputType;
}

/**
 * Adds a new field definition to an existing GraphQLObjectType.
 * Note: Modifies the type in place by adding to the fields map.
 * @param options Options object containing the field definition and the target type.
 */
export const addFieldToType = ({
  field,
  type,
}: AddFieldToTypeOptions): void => {
  // Type guard
  if (!(type instanceof GraphQLObjectType)) {
    console.error('Cannot add field: Target type is not a GraphQLObjectType.');
    return;
  }

  // Validate field type
  if (!isOutputType(field.type)) {
    // Use isOutputType here
    console.error(
      `Cannot add field "${field.name}": Provided type is not a valid GraphQLOutputType.`
    );
    return;
  }

  // Validate field name and type presence
  if (!field.name || !field.type) {
    console.error(
      `Cannot add field: Field definition must include 'name' and 'type'.`
    );
    return;
  }

  // Get the public fields map
  const fields = type.getFields(); // Use the public API

  if (fields[field.name]) {
    console.warn(
      `Field "${field.name}" already exists on type "${type.name}". Overwriting.`
    );
  }

  // Create a proper GraphQLField from the field config
  const graphqlField = {
    ...field,
    args: field.args || [],
    astNode: undefined,
    deprecationReason: field.deprecationReason || null,
    description: field.description || null, // Ensure description is not undefined
    extensions: field.extensions || null,
    isDeprecated: Boolean(field.deprecationReason),
  };

  // Directly add/overwrite the field in the map
  fields[field.name] = graphqlField as any; // Cast to overcome type incompatibility

  // Verify (optional) - Check if the field is now present after modification
  const newFields = type.getFields();
  if (field.name in newFields) {
    console.log(
      `Successfully added/updated field "${field.name}" to type "${type.name}".`
    );
  } else {
    console.error(
      `Failed to add/update field "${field.name}" to type "${type.name}". Modification might not be reflected.`
    );
  }
};
