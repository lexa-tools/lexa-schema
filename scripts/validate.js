// validate.js
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const glob = require('glob');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// Read command-line arguments: schema and data glob
const [schemaPath, dataPattern] = process.argv.slice(2);

if (!schemaPath || !dataPattern) {
  console.error('Usage: node validate.js <schema.json> <data-glob>');
  process.exit(1);
}

// Load JSON schema
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Initialize AJV
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// Find all files matching glob
const files = glob.sync(dataPattern);

if (files.length === 0) {
  console.error('No files matched the pattern:', dataPattern);
  process.exit(1);
}

// Track validation failures for exit code
let hasError = false;

// Validate each file
files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  if (ext !== '.yaml' && ext !== '.yml') return;

  const data = yaml.parse(fs.readFileSync(file, 'utf8'));
  const valid = validate(data);

  if (valid) {
    console.log(`${file}: valid`);
  } else {
    console.log(`${file}: invalid`);
    console.log(validate.errors);
    hasError = true;
  }
});

// Exit with nonzero code if any validation failed
process.exit(hasError ? 1 : 0);
