import { introspectionFromSchema } from 'graphql';
import { writeFileSync } from 'node:fs';
import signale from 'signale';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command-line arguments
const argv = yargs(hideBin(process.argv)).option('schema', {
  alias: 's',
  type: 'string',
  description: 'Path to the GraphQL schema file',
  demandOption: true, // Make sure schema file is provided
}).argv;

// Dynamically import the schema file based on the user input
import(schemaFilePath)
  .then((schemaModule) => {
    const schema = schemaModule.default;

    // Convert the schema to introspection format
    const introspectionSchema = introspectionFromSchema(schema);

    // Write the introspection result to a JSON file
    writeFileSync('./schema.json', JSON.stringify(introspectionSchema));

    signale.info(
      'GraphQL schema was converted to JSON and saved to schema.json'
    );
  })
  .catch((error) => {
    signale.error('Error loading schema file:', error);
  });
