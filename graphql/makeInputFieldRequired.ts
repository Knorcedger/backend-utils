import type { GraphQLInputFieldConfigMap } from 'graphql';

import { GraphQLNonNull } from 'graphql';

/**
 * Modifies an input fields map to make a specific field required.
 * @param inputFields The map of input fields (e.g., ClientInputFields).
 * @param fieldName The name of the field to make required.
 */
export const makeInputFieldRequired = (
  inputFields: GraphQLInputFieldConfigMap,
  fieldName: string
): void => {
  const field = inputFields[fieldName];
  if (!field) {
    console.warn(
      `Field "${fieldName}" not found in input fields. Cannot make required.`
    );
    return;
  }

  // Check if the type is already NonNull
  if (!(field.type instanceof GraphQLNonNull)) {
    field.type = new GraphQLNonNull(field.type);
    // console.log(`Made input field "${fieldName}" required.`);
  } else {
    console.log(`Input field "${fieldName}" is already required.`);
  }
};
