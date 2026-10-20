import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(projectDirectory, 'www');
const outputDirectory = resolve(projectDirectory, 'dist');
const activationKey = process.env.SQLITE_ENCRYPTED_ACTIVATION_KEY?.trim() ?? '';

await rm(outputDirectory, {recursive: true, force: true});
await mkdir(outputDirectory, {recursive: true});
await cp(sourceDirectory, outputDirectory, {recursive: true});

const configPath = resolve(outputDirectory, 'js', 'config.js');
const config = await readFile(configPath, 'utf8');
await writeFile(
  configPath,
  config.replace('__SQLITE_ENCRYPTED_ACTIVATION_KEY__', JSON.stringify(activationKey)),
  'utf8'
);

console.log(
  activationKey.length === 0
    ? 'Built without SQLITE_ENCRYPTED_ACTIVATION_KEY; the app will show a configuration error.'
    : 'Built with the SQLite.Encrypted activation key.'
);

