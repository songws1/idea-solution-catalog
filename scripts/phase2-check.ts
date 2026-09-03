/* Phase 2 verification harness (temporary): exercise lib/csv.ts against the real dataset. */
import { getDatasetVariant, loadDataset } from "../lib/dataset";
import { buildIdeasCsv, buildSolutionsCsv, variantLabel } from "../lib/csv";

const variant = getDatasetVariant();
const dataset = loadDataset(variant);
const label = variantLabel(variant);

const ideasCsv = buildIdeasCsv(dataset);
const solsCsv = buildSolutionsCsv(dataset);

const countRows = (csv: string) => csv.trim().split(/\r?\n/).length - 1;
const iRows = countRows(ideasCsv);
const sRows = countRows(solsCsv);
console.log(`variant=${variant} label=${label}`);
console.log(`ideas.csv rows=${iRows} (expect ${dataset.ideas.length}) ${iRows === dataset.ideas.length ? "OK" : "MISMATCH"}`);
console.log(`solutions.csv rows=${sRows} (expect ${dataset.solutions.length}) ${sRows === dataset.solutions.length ? "OK" : "MISMATCH"}`);

// Headers line up.
console.log("ideas header ok:", ideasCsv.split("\r\n")[0].startsWith("id,doc_type,org,service,title"));
console.log("solutions header ok:", solsCsv.split("\r\n")[0].startsWith("id,doc_type,resolves_idea_id,name,artifact_type"));

// No raw user ids leak into the CSVs.
const idPattern = /synthetic-user-\d+/;
console.log("no raw user ids in ideas.csv:", !idPattern.test(ideasCsv));
console.log("no raw user ids in solutions.csv:", !idPattern.test(solsCsv));

// Embeddings must not appear anywhere.
console.log("no embedding column:", !ideasCsv.includes("embedding") && !solsCsv.includes("embedding"));

// Name resolution spot-checks: known submitter name appears.
console.log("display name present:", ideasCsv.includes("Jordan Avery"));

// Quoting round-trip: any field containing a comma/quote/newline is wrapped.
const sample = ideasCsv.split("\r\n").find((l) => /"/.test(l));
console.log("quoting exercised:", Boolean(sample));

// Duplicate candidates flattened: count + comma-joined ids, e.g. 2,"idea-0007,idea-0008"
const dupLine = ideasCsv.split("\r\n").find((l) => l.includes(",2,"));
if (dupLine) console.log("dup flattening sample:", dupLine.slice(-80));
