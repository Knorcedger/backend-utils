import {
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql';

export type FieldDefinitions = Record<string, FieldConfig>;

interface BaseFieldConfig {
  /** Optional field description */
  description?: string;
  /** Which types should include this field ['input', 'output', 'update'] */
  include?: Types[];
  /** Permission required to access this field */
  permission?: Permission;
  /** In which types this field is required ['input', 'output', 'update'] */
  required?: Types[];
  /** Optional resolver function for the field. Applied only to output */
  resolve?: (value: any, args: any, context: any) => any;
}

type CreateTypesReturn<Name extends string> = {
  [K in
    | `${Name}InputFields`
    | `${Name}InputType`
    | `${Name}OutputFields`
    | `${Name}Type`
    | `${Name}UpdateFields`
    | `${Name}UpdateType`]: any;
};

interface DistinctTypesFieldConfig extends BaseFieldConfig {
  /** Define different types, mainly when using object types */
  distinctTypes: {
    input: any;
    output: any;
    update?: any;
  };
  type?: never; // Ensures type cannot be used with distinctTypes
}

/**
 * Type for field configuration that uses arrays for include and required settings
 */

type FieldConfig = DistinctTypesFieldConfig | SingleTypeFieldConfig;

type Permission = 'loggedin' | 'self';

interface SingleTypeFieldConfig extends BaseFieldConfig {
  distinctTypes?: never;
  /** The GraphQL type for this field */
  type: any; // Ensures distinctTypes cannot be used with type
}

interface SingleTypeFieldConfig extends BaseFieldConfig {
  distinctTypes?: never;
  /** The GraphQL type for this field */
  type: any; // Ensures distinctTypes cannot be used with type
}

/**
 * Type for field configuration that uses arrays for include and required settings
 */
type Types = 'input' | 'output' | 'update';

/**
 * Creates GraphQL types (output, input, and update) from field definitions
 *
 * @param name Base name for the types
 * @param fieldDefinitions Field definitions using the array-based include/required format
 * @returns Object containing the generated types and their fields
 */
export const createTypes = <Name extends string>(
  name: Name,
  fieldDefinitions: FieldDefinitions
): CreateTypesReturn<Name> => {
  const outputFields = {};
  const inputFields = {};
  const updateFields = {};

  // Process each field based on its configuration
  Object.entries(fieldDefinitions).forEach(([fieldName, config]) => {
    const {
      description,
      include = ['input', 'output', 'update'],
      permission,
      required = [],
      resolve,
    } = config;

    // Check if we have distinct types or a single type
    const hasDistinctTypes = 'distinctTypes' in config;

    // Add to output type if included
    if (include.includes('output')) {
      const fieldType = hasDistinctTypes
        ? (config as DistinctTypesFieldConfig).distinctTypes.output
        : (config as SingleTypeFieldConfig).type;

      outputFields[fieldName] = {
        description,
        ...(permission && {
          resolve: (value, args, context) => {
            if (permission === 'self') {
              // Check if the user has permission to access this field
              if (context.user.email !== value.email) {
                return null;
              }
            } else if (permission === 'loggedin') {
              // Check if the user is logged in
              if (!context.user) {
                return null;
              }
            }

            return value[fieldName];
          },
        }),
        ...(resolve && {
          resolve: (value, args, context) => {
            // Call the custom resolver if provided
            return resolve(value, args, context);
          },
        }),
        type: required.includes('output')
          ? new GraphQLNonNull(fieldType)
          : fieldType,
      };
    }

    // Add to input type if included
    if (include.includes('input')) {
      const fieldType = hasDistinctTypes
        ? (config as DistinctTypesFieldConfig).distinctTypes.input
        : (config as SingleTypeFieldConfig).type;

      inputFields[fieldName] = {
        description,
        type: required.includes('input')
          ? new GraphQLNonNull(fieldType)
          : fieldType,
      };
    }

    // Add to update type if included
    if (include.includes('update')) {
      const fieldType = hasDistinctTypes
        ? (config as DistinctTypesFieldConfig).distinctTypes.update
        : (config as SingleTypeFieldConfig).type;

      updateFields[fieldName] = {
        description,
        type: required.includes('update')
          ? new GraphQLNonNull(fieldType)
          : fieldType,
      };
    }
  });

  // Generate the GraphQL types
  const outputType = new GraphQLObjectType({
    description: `${name} output type`,
    fields: outputFields,
    name,
  });

  const inputType = new GraphQLInputObjectType({
    description: `Input type for creating a new ${name}`,
    fields: inputFields,
    name: `${name}Input`,
  });

  const updateType = new GraphQLInputObjectType({
    description: `Input type for updating an existing ${name}`,
    fields: updateFields,
    name: `${name}UpdateInput`,
  });

  return {
    [`${name}InputFields`]: inputFields,
    [`${name}InputType`]: inputType,
    [`${name}OutputFields`]: outputFields,
    [`${name}Type`]: outputType,
    [`${name}UpdateFields`]: updateFields,
    [`${name}UpdateType`]: updateType,
  } as CreateTypesReturn<Name>;
};
