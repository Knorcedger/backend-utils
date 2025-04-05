import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  generates: {
    'types/graphql.gen.ts': {
      config: {
        enumsAsTypes: true,
      },
      plugins: [
        {
          add: {
            content: '// !!AUTO GENERATED FILE - DO NOT MODIFY!!',
          },
        },
        'typescript',
        'typescript-operations',
      ],
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write', 'eslint --fix'],
  },
  ignoreNoDocuments: true,
  overwrite: true,
  schema: './schema.json',
};

export default config;
