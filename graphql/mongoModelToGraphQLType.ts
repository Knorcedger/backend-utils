import type {
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql';

import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';
import { GraphQLDate, GraphQLObjectID } from 'graphql-scalars';
import mongoose from 'mongoose';

type EnumTypeDefs = Record<string, string[]>;
interface FieldDef {
  description?: string;
  // Either a scalar GraphQL type (e.g. GraphQLString, GraphQLID),
  // a GraphQLEnumType name, or a nested type name (string)
  gqlType: GraphQLEnumType | GraphQLObjectType | GraphQLScalarType | string;
  isArray?: boolean;
  isEnum: boolean;
  required: boolean;
}

interface ObjectTypeDef {
  description: string;
  fields: Record<string, FieldDef>;
  name: string;
}

const toEnum = (value: string): string =>
  value
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/ /g, '_')
    .replace(/\//g, '_')
    .replace(/'/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\./g, '')
    .replace(/&/g, '')
    .replace(/__/g, '_');

interface ConversionResult {
  inputFields: GraphQLInputFieldConfigMap;
  inputType: GraphQLInputObjectType;
}

/**
 * Main function to be used by consumers
 */
export function createInputTypeFromOutputType(
  outputType: GraphQLObjectType,
  inputTypeName?: string
): ConversionResult {
  return convertOutputTypeToInputType(
    outputType,
    inputTypeName || outputType.name,
    new Map()
  );
}

/**
 * Transforms a given Mongoose model into GraphQL types.
 * This version uses the schema’s original tree (nested definition) and
 * properly distinguishes between shorthand (leaf) definitions and nested subdocuments.
 */
export function transformModelToGraphQLTypes(model: mongoose.Model<any>) {
  const enumTypeDefs: EnumTypeDefs = {};
  const objectTypeDefs: Record<string, ObjectTypeDef> = {};

  // --- Helper: Create/retrieve an object type definition ---
  function ensureObjectType(typeName: string, description = ''): ObjectTypeDef {
    if (!objectTypeDefs[typeName]) {
      objectTypeDefs[typeName] = {
        description: description || `Generated GraphQL type for ${typeName}`,
        fields: {},
        name: typeName,
      };
    }
    return objectTypeDefs[typeName];
  }

  // --- Helper: Map Mongoose scalar to GraphQL scalar ---
  function mapMongooseTypeToGraphQLType(type: any) {
    if (type === Number) return GraphQLFloat;
    if (type === String) return GraphQLString;
    if (type === Boolean) return GraphQLBoolean;
    if (type === Date) return GraphQLDate;
    if (type === mongoose.Schema.Types.ObjectId) return GraphQLObjectID;
    return GraphQLString;
  }

  // --- Normalize a field definition: wrap shorthand values into an object ---
  function normalizeFieldDef(fieldDef: any): any {
    if (typeof fieldDef !== 'object' || fieldDef === null) {
      return { type: fieldDef };
    }
    return fieldDef;
  }

  // --- Parse a single field definition (which has a "type" property) ---
  function parseFieldDefinition(
    objectType: ObjectTypeDef,
    parentTypeName: string,
    fieldName: string,
    fieldDef: any,
    isArray: boolean = false
  ) {
    // Normalize in case the field was given in shorthand.
    fieldDef = normalizeFieldDef(fieldDef);
    const { description = '', enum: enumVals, required, type } = fieldDef;
    const req = !!required;
    let innerType = type;

    // If the type is an array, mark it and unwrap the first element.
    if (Array.isArray(innerType)) {
      isArray = true;
      innerType = innerType[0];
    }

    // 1) If an enum is provided, handle it.
    if (enumVals && Array.isArray(enumVals)) {
      const cleanParent = stripTypeSuffix(parentTypeName).replace(/\./g, '');
      const cleanField = fieldName.replace(/\./g, '');
      const enumName = `${cleanParent}${capitalize(cleanField)}Enum`;
      if (!enumTypeDefs[enumName]) {
        enumTypeDefs[enumName] = enumVals;
      }
      objectType.fields[fieldName] = {
        description,
        gqlType: enumName,
        isArray,
        isEnum: true,
        required: req,
      };
      return;
    }

    // 2) If the innerType is a function, treat as a scalar.
    if (typeof innerType === 'function') {
      const finalType = mapMongooseTypeToGraphQLType(innerType);
      objectType.fields[fieldName] = {
        description,
        gqlType: finalType,
        isArray,
        isEnum: false,
        required: req,
      };
      return;
    }

    // 3) If innerType is a Mongoose Schema, use its obj to build a nested type.
    if (innerType instanceof mongoose.Schema) {
      const nestedTypeName = `${stripTypeSuffix(parentTypeName)}${capitalize(fieldName)}Type`;
      parseTree(innerType.obj, nestedTypeName);
      objectType.fields[fieldName] = {
        description,
        gqlType: nestedTypeName,
        isArray,
        isEnum: false,
        required: req,
      };
      return;
    }

    // 4) If innerType is an object (and not a function or array) and does NOT itself have a "type" key,
    // then treat it as a nested subdocument.
    if (innerType && typeof innerType === 'object' && !('type' in innerType)) {
      const nestedTypeName = `${stripTypeSuffix(parentTypeName)}${capitalize(fieldName)}Type`;
      parseTree(innerType, nestedTypeName);
      objectType.fields[fieldName] = {
        description,
        gqlType: nestedTypeName,
        isArray,
        isEnum: false,
        required: req,
      };
      return;
    }

    // 5) Otherwise, assume it represents a scalar.
    const finalType = mapMongooseTypeToGraphQLType(innerType);
    objectType.fields[fieldName] = {
      description,
      gqlType: finalType,
      isArray,
      isEnum: false,
      required: req,
    };
  }

  // --- Recursively parse the schema tree ---
  function parseTree(tree: any, parentTypeName: string): void {
    const objectType = ensureObjectType(
      parentTypeName,
      `Generated GraphQL type for ${parentTypeName}`
    );
    for (const key in tree) {
      // Skip reserved keys.
      if (['__v', '_id', 'id', 'idoptions'].includes(key.toLowerCase()))
        continue;
      let field = tree[key];
      let isArray = false;
      if (Array.isArray(field)) {
        isArray = true;
        field = field[0];
      }
      // Normalize the field if given in shorthand.
      field = normalizeFieldDef(field);

      // If the field definition does NOT have a "type" property, treat it as a nested subdocument.
      if (!('type' in field)) {
        const nestedTypeName = `${stripTypeSuffix(parentTypeName)}${capitalize(key)}Type`;
        parseTree(field, nestedTypeName);
        objectType.fields[key] = {
          description: field.description || '',
          gqlType: nestedTypeName,
          isArray,
          isEnum: false,
          required: !!field.required,
        };
      } else {
        // Otherwise, process it as a standard (leaf or nested) field definition.
        parseFieldDefinition(objectType, parentTypeName, key, field, isArray);
      }
    }
  }

  // --- Start processing the model's schema using its object representation ---
  function parseModelSchema(model: mongoose.Model<any>) {
    const schema = model.schema;
    const modelName = model.modelName;
    const typeName = `${modelName}Type`;
    // Use schema.obj to capture the full structure:
    parseTree(schema.obj, typeName);
  }

  parseModelSchema(model);

  // --- Convert collected enum definitions into GraphQLEnumType objects ---
  const enumTypes: Record<string, GraphQLEnumType> = {};
  for (const enumName in enumTypeDefs) {
    const values = enumTypeDefs[enumName];
    // console.log('enumName', enumName, enumTypeDefs);

    const enumValueMap: any = {};
    for (const val of values) {
      const key = toEnum(val);
      enumValueMap[key] = { value: val };
    }
    enumTypes[enumName] = new GraphQLEnumType({
      name: enumName,
      values: enumValueMap,
    });
  }

  // --- Create GraphQLObjectType objects for every collected type definition ---
  const objectTypes: Record<string, GraphQLObjectType> = {};
  for (const typeName in objectTypeDefs) {
    const def = objectTypeDefs[typeName];
    objectTypes[typeName] = new GraphQLObjectType({
      description: def.description,
      fields: () => {
        const fields: any = {};
        for (const fieldName in def.fields) {
          const fd = def.fields[fieldName];
          let fieldType: any;
          if (fd.isEnum) {
            fieldType = enumTypes[fd.gqlType as string];
          } else if (typeof fd.gqlType === 'string') {
            fieldType = objectTypes[fd.gqlType];
          } else {
            fieldType = fd.gqlType;
          }
          if (fd.isArray) {
            fieldType = new GraphQLList(fieldType);
          }
          if (fd.required) {
            // fieldType = new GraphQLNonNull(fieldType);
          }
          fields[fieldName] = {
            description: fd.description,
            resolve: (source: any) => source[fieldName],
            type: fieldType,
          };
        }
        return fields;
      },
      name: def.name,
    });
  }

  return {
    enumTypes,
    objectTypes,
  };
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper function to convert a field type to its input equivalent
 */
function convertFieldTypeToInputType(
  fieldType: GraphQLOutputType,
  typeCache: Map<string, GraphQLInputObjectType> = new Map()
): GraphQLInputType | null {
  // Handle NonNull wrapper
  if (fieldType instanceof GraphQLNonNull) {
    const innerInputType = convertFieldTypeToInputType(
      fieldType.ofType,
      typeCache
    );
    return innerInputType ? new GraphQLNonNull(innerInputType) : null;
  }

  // Handle List wrapper
  if (fieldType instanceof GraphQLList) {
    const innerInputType = convertFieldTypeToInputType(
      fieldType.ofType,
      typeCache
    );
    return innerInputType ? new GraphQLList(innerInputType) : null;
  }

  // Handle scalar types (they work the same for input and output)
  if (
    fieldType instanceof GraphQLScalarType ||
    fieldType instanceof GraphQLEnumType
  ) {
    return fieldType;
  }

  // Handle object types (need to be converted to input object types)
  if (fieldType instanceof GraphQLObjectType) {
    const { inputType } = convertOutputTypeToInputType(
      fieldType,
      fieldType.name,
      typeCache
    );
    return inputType;
  }

  // If we reach here, we don't know how to convert this type
  // console.warn(`Could not convert type: ${fieldType}`);
  return null;
}

/**
 * Converts a GraphQL output type to an equivalent input type.
 * Handles nested objects, NonNull, and List types correctly.
 *
 * @param outputType - The GraphQL output type to convert
 * @param inputTypeName - Base name for the input type (will be appended with "InputType")
 * @param typeCache - Cache to avoid infinite recursion with circular references
 * @returns An object containing the input type and its field definitions
 */
function convertOutputTypeToInputType(
  outputType: GraphQLObjectType,
  inputTypeName: string,
  typeCache: Map<string, GraphQLInputObjectType> = new Map()
): ConversionResult {
  const finalInputTypeName = `${inputTypeName}InputType`;

  // Check if we've already created this input type (prevents infinite recursion)
  if (typeCache.has(finalInputTypeName)) {
    return {
      inputFields: {}, // Empty since we're reusing an existing type
      inputType: typeCache.get(finalInputTypeName)!,
    };
  }

  // Create placeholder for circular references
  const inputFields: GraphQLInputFieldConfigMap = {};
  const inputType = new GraphQLInputObjectType({
    description: `Input version of the ${outputType.name} type`,
    fields: () => inputFields,
    name: finalInputTypeName,
  });

  // Add to cache immediately to handle circular references
  typeCache.set(finalInputTypeName, inputType);

  // Convert each field of the output type
  const outputFields = outputType.getFields();

  for (const [fieldName, fieldConfig] of Object.entries(outputFields)) {
    const inputField = convertFieldTypeToInputType(fieldConfig.type, typeCache);
    if (inputField) {
      inputFields[fieldName] = {
        defaultValue: undefined, // Default values would typically come from the schema or be set later
        description: fieldConfig.description,
        type: inputField,
      };
    }
  }

  return { inputFields, inputType };
}

function stripTypeSuffix(str: string): string {
  return str.endsWith('Type') ? str.slice(0, -4) : str;
}
