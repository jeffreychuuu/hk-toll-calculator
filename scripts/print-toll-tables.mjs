// scripts/print-toll-tables.mjs
// Prints the static toll-table blocks for index.html. Paste the output between
// the <section id="about"> markers shown below, then run `npm test` to confirm
// the page still matches js/data.js.
import { tollTableBlocks } from '../js/toll-tables.js';

process.stdout.write(tollTableBlocks() + '\n');
