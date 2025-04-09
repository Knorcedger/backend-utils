# Backend Utils

A comprehensive collection of utilities designed to simplify backend GraphQL and MongoDB development.

## IMPORTANT

This package assumes that you use node 22.6 or newer that supports type stripping

## Contents

- [Installation](#installation)
- [GraphQL Utilities](#graphql-utilities)
  - [MongoDB to GraphQL Type Conversion](#1-mongodb-to-graphql-type-conversion)
  - [GraphQL Type Creation](#2-graphql-type-creation)
  - [Custom GraphQL Scalars](#3-custom-graphql-scalars)
  - [getRequestedFields](#4-getrequestedfields)
  - [populate](#5-populate)
- [Utility Functions](#utility-functions)
  - [catchAppErrors](#1-catchapperrors)
  - [optionallyAddAttrs](#2-optionallyaddattrs)
- [Mongoose Utilities](#mongoose-utilities)
  - [Database Connection](#1-database-connection)
- [TypeScript tsconfig.json](#typescript)
- [License](#license)
- [Contributing](#contributing)

## Installation

```bash
npm install @knorcedger/backend-utils
```

## GraphQL Utilities

### 1. MongoDB to GraphQL Type Conversion

Automatically generate GraphQL types from your Mongoose models.

#### `transformModelToGraphQLTypes()`

Transforms a Mongoose model into GraphQL object and enum types.

```typescript
import UserModel from './models/UserModel';
import { transformModelToGraphQLTypes } from '@knorcedger/backend-utils';

// Generate GraphQL types from your Mongoose model
export const { objectTypes, enumTypes } =
  transformModelToGraphQLTypes(UserModel);

// Access the generated type
export const UserType = objectTypes.UserType;
```

#### `createInputTypeFromOutputType()`

Converts an output GraphQL type to an input type for mutations.

```typescript
import GuestAppPreferencesModel from './models/GuestAppPreferencesModel';
import {
  createInputTypeFromOutputType,
  transformModelToGraphQLTypes,
} from '@knorcedger/backend-utils';

// Generate GraphQL types from your model
export const { objectTypes } = transformModelToGraphQLTypes(
  GuestAppPreferencesModel
);

// Get the output type
export const GuestAppPreferencesType = objectTypes.GuestAppPreferencesType;

// Create an input type from the output type
export const {
  inputFields: GuestAppPreferencesInputFields,
  inputType: GuestAppPreferencesInputType,
} = createInputTypeFromOutputType(GuestAppPreferencesType);
```

### 2. GraphQL Type Creation

#### `createTypes()`

Creates a set of GraphQL types (output, input, and update) from field definitions.

```typescript
import { createTypes, GraphQLString } from '@knorcedger/backend-utils';

const userTypes = createTypes('User', {
  email: {
    description: "The user's email address",
    required: ['input', 'output'],
    type: GraphQLString,
  },
  name: {
    description: "The user's full name",
    type: GraphQLString,
  },
  password: {
    description: "The user's password (hashed)",
    include: ['input'],
    required: ['input'],
    type: GraphQLString,
  },
});

// Access the generated types
const { UserType, UserInputType, UserUpdateType } = userTypes;
```

##### Field Configuration Properties

Each field can be configured with the following properties:

- **`type`**: The GraphQL type for this field (used when the same type applies to all variants).

  ```typescript
  type: GraphQLString;
  ```

- **`distinctTypes`**: Define different types for input/output/update (used instead of `type`).

  ```typescript
  distinctTypes: {
    input: GraphQLInputFileType,
    output: GraphQLFileType,
    update: GraphQLInputFileType
  }
  ```

- **`description`**: Optional field description that appears in GraphQL documentation.

  ```typescript
  description: "The user's profile picture";
  ```

- **`include`**: Specifies which type variants should include this field (defaults to all).

  ```typescript
  include: ['input', 'output']; // Exclude from update type
  ```

- **`required`**: Specifies in which type variants this field is required.

  ```typescript
  required: ['input']; // Field is required in input type but optional elsewhere
  ```

- **`resolve`**: Custom resolver function for the field (only applied to output type).

  ```typescript
  resolve: (user, args, context) => {
    return user.firstName + ' ' + user.lastName;
  };
  ```

- **`permission`**: Permission check for accessing field values.
  - `'self'`: Only the user can access their own data
  - `'loggedin'`: Any authenticated user can access the field
  ```typescript
  permission: 'self'; // Only the user can see their own email
  ```

The function returns an object with six properties:

- `[Name]Type`: The output GraphQL object type
- `[Name]OutputFields`: The fields object for the output type
- `[Name]InputType`: The input GraphQL object type for creating new objects
- `[Name]InputFields`: The fields object for the input type
- `[Name]UpdateType`: The input GraphQL object type for updating objects
- `[Name]UpdateFields`: The fields object for the update type

### 3. Custom GraphQL Scalars

#### `IntRangeType(min, max)`

Creates a GraphQL scalar that validates integers within a specified range.

```typescript
import { IntRangeType } from '@knorcedger/backend-utils';
import { GraphQLObjectType, GraphQLSchema } from 'graphql';

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    fields: {
      rating: { type: IntRangeType(1, 5) }, // Only accepts integers 1-5
    },
    name: 'Query',
  }),
});
```

### 4. getRequestedFields

Extracts requested field names from a GraphQL resolver info object.

```typescript
import { getRequestedFields } from '@knorcedger/backend-utils';

const resolvers = {
  Query: {
    getUser: (_, args, context, info) => {
      const fields = getRequestedFields(info);
      console.log('Requested fields:', fields); // ['id', 'name', 'email', etc.]
      // Now you can optimize your database query based on requested fields
    },
  },
};
```

### 5. populate

Intelligently populates MongoDB references based on GraphQL query fields

This function:

1.  Analyzes the GraphQL query to determine which fields were requested
2.  Only populates references for fields that were actually requested
3.  Maintains both the ID reference and the populated object
4.  Works with both single objects and arrays of results
5.  Handles special cases like newly created documents

```typescript
import { populate } from '@knorcedger/backend-utils';

const resolvers = {
  Query: {
    getPost: async (_, { id }, context, info) => {
      const query = PostModel.findById(id);
      return populate(query, info, ['author', 'comments']);
    },
  },
};
```

## Utility Functions

### 1. catchAppErrors

#### `catchAppErrors()`

Prevents application crashes by catching uncaught exceptions and unhandled promise rejections.

```typescript
import { catchAppErrors } from '@knorcedger/backend-utils';

// Add this at the end of your main application file
catchAppErrors();
```

### 2. optionallyAddAttrs

Selectively copies properties from a source object based on a list of attribute names.

```typescript
import { optionallyAddAttrs } from '@knorcedger/backend-utils';

const resolvers = {
  Mutation: {
    updateUser: async (_, { id, input }) => {
      // Only update fields that were actually provided
      const updates = optionallyAddAttrs(input, ['name', 'email', 'age']);
      return UserModel.findByIdAndUpdate(id, updates, { new: true });
    },
  },
};
```

## Mongoose Utilities

### 1. Database Connection

#### `mongooseConnect()`

Connects to a MongoDB database using Mongoose with proper error handling.

```typescript
import mongoose from 'mongoose';
import { mongooseConnect } from '@knorcedger/backend-utils';

// With default logging
await mongooseConnect(mongoose, 'mongodb://localhost:27017/mydatabase');

// With disabled logging
await mongooseConnect(mongoose, 'mongodb://localhost:27017/mydatabase', {
  logging: false,
});
```

## Typescript

Inside the typescript folder there's a tsconfig.json that can be used to run typescript checks in the parent project.

Inside your package.json

```
"scripts": {
  "typecheck": "cp node_modules/@knorcedger/backend-utils/tsconfig.json . && npx tsc --noEmit && rm -f tsconfig.json"
}
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
