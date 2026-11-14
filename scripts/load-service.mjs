import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const requirePackage = createRequire(import.meta.url);
const modules = new Map();

/** Load services and their TypeScript dependencies without a separate build. */
export function loadService(name) {
  return loadFile(path.join(root, "src/services", `${name}.ts`));
}

function loadFile(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const compiled = { exports: {} };
  modules.set(file, compiled);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (id) => id.startsWith("@/")
    ? loadFile(path.join(root, `${id.slice(2)}.ts`))
    : id.startsWith(".")
      ? loadFile(path.resolve(path.dirname(file), `${id}.ts`))
      : requirePackage(id);
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(localRequire, compiled, compiled.exports);
  return compiled.exports;
}
