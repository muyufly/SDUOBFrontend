import fs from "node:fs";
const contract = JSON.parse(fs.readFileSync("api/openapi.json", "utf8"));
const reports = ["docs/live-verification.json", "docs/live-cleanup.json"].map(
  (path) => JSON.parse(fs.readFileSync(path, "utf8")),
);
const checks = reports.flatMap((report) => report.checks);
const rows = [];
for (const [path, operations] of Object.entries(contract.paths))
  for (const [method, operation] of Object.entries(operations)) {
    const relative = path.replace("/api/v1", "");
    const re = new RegExp("^" + relative.replace(/\{[^}]+\}/g, "[^/]+") + "$");
    const hits = checks.filter(
      (c) =>
        c.method === method.toUpperCase() &&
        re.test(c.path.split("?")[0]) &&
        c.status >= 200 &&
        c.status < 300,
    );
    rows.push({
      method: method.toUpperCase(),
      path: relative,
      operation: operation.operationId,
      passed: hits.length > 0,
      requests: hits.length,
    });
  }
const covered = rows.filter((row) => row.passed).length;
fs.writeFileSync(
  "docs/API-COVERAGE.md",
  `# 接口覆盖\n\n本地 OpenAPI 快照共 ${rows.length} 个操作。真实联调及清理日志中，${covered} 个操作有成功响应证据。此表表示接口被实际调用，不代表每个参数组合都穷举测试。\n\n| 方法 | 路径 | 真实联调 |\n|---|---|---|\n` +
    rows
      .map(
        (r) =>
          `| ${r.method} | \`${r.path}\` | ${r.passed ? "通过" : "未覆盖"} |`,
      )
      .join("\n") +
    "\n",
);
console.log(`Contract operation coverage: ${covered}/${rows.length}`);
