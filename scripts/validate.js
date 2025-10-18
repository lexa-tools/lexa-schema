// scripts/validate.js
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

// Find all files matching glob
const files = glob.sync(dataPattern);

if (files.length === 0) {
    console.error('No files matched the pattern:', dataPattern);
    process.exit(1);
}

// Track validation failures
let hasError = false;

// Initialize AJV with loadSchema for resolving $refs
const ajv = new Ajv({ allErrors: true, strict: false, loadSchema: async (uri) => {
    // Resolve the $ref relative to the folder containing the main schema
    const refPath = path.resolve(path.dirname(schemaPath), uri);
    if (!fs.existsSync(refPath)) {
        throw new Error(`Referenced schema not found: ${refPath}`);
    }
    const data = fs.readFileSync(refPath, 'utf8');
    return JSON.parse(data);
}});

addFormats(ajv);

(async () => {
    try {
        // Load the main schema
        const mainSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const validate = await ajv.compileAsync(mainSchema);

        // Validate each YAML file
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (ext !== '.yaml' && ext !== '.yml') continue;

            const data = yaml.parse(fs.readFileSync(file, 'utf8'));
            const valid = validate(data);

            if (valid) {
                console.log(`${file}: valid`);
            } else {
                console.log(`${file}: invalid`);
                console.log(validate.errors);
                hasError = true;
            }
        }

        process.exit(hasError ? 1 : 0);
    } catch (err) {
        console.error('Validation error:', err);
        process.exit(1);
    }
})();
