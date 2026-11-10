const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("LESS entry names are independent of the checkout directory", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "passbolt-less-entries-"));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  const entries = ["first-checkout", "nested/second-checkout"].map((checkout) => {
    const checkoutRoot = path.join(temporaryDirectory, checkout);
    fs.mkdirSync(path.join(checkoutRoot, "config"), { recursive: true });
    fs.mkdirSync(path.join(checkoutRoot, "src"));
    fs.copyFileSync(__filename.replace(".test.cjs", ".js"), path.join(checkoutRoot, "config/webpack.less.js"));
    fs.copyFileSync(path.join(root, "package.json"), path.join(checkoutRoot, "package.json"));
    fs.symlinkSync(path.join(root, "node_modules"), path.join(checkoutRoot, "node_modules"), "junction");
    fs.symlinkSync(path.join(root, "src/less"), path.join(checkoutRoot, "src/less"), "junction");

    const { buildLessEntries } = require(path.join(checkoutRoot, "config/webpack.less.js"));
    const result = buildLessEntries();
    assert.ok(Object.keys(result).length > 2, "theme entries must be included");
    for (const [name, filename] of Object.entries(result)) {
      assert.equal(path.isAbsolute(name), false, "entry names must not contain the checkout root");
      assert.equal(name.includes("\\"), false, "entry names must use POSIX separators");
      assert.equal(path.isAbsolute(filename), true, "module paths must remain absolute");
      assert.ok(filename.startsWith(`${checkoutRoot}${path.sep}`));
      assert.ok(fs.statSync(filename).isFile());
    }
    return Object.keys(result);
  });

  assert.deepEqual(entries[0], entries[1]);
});
