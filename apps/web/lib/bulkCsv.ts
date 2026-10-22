export interface CatalogRow {
  type: "product" | "variant";
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
}
export interface CatalogChange {
  row: CatalogRow;
  price?: number | null;
  stock?: number;
}

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CATALOG_HEADERS = ["type", "id", "name", "sku", "price", "stock"];

export function catalogToCSV(rows: CatalogRow[]): string {
  return [
    CATALOG_HEADERS.join(","),
    ...rows.map((r) => [r.type, r.id, r.name, r.sku, r.price ?? "", r.stock].map(esc).join(",")),
  ].join("\n");
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Compare an edited CSV against current rows; returns only rows whose price or stock changed. */
export function diffCatalogCSV(
  text: string,
  current: CatalogRow[],
): { changes: CatalogChange[]; errors: string[] } {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { changes: [], errors: ["File is empty"] };
  const head = splitLine(lines[0]).map((h) => h.toLowerCase());
  const iId = head.indexOf("id"),
    iPrice = head.indexOf("price"),
    iStock = head.indexOf("stock");
  if (iId < 0) return { changes: [], errors: ['Missing "id" column'] };
  const byId = new Map(current.map((r) => [r.id, r]));
  const changes: CatalogChange[] = [];
  lines.slice(1).forEach((line, n) => {
    const cells = splitLine(line);
    const row = byId.get(cells[iId]);
    if (!row) {
      errors.push(`Row ${n + 2}: unknown id`);
      return;
    }
    const ch: CatalogChange = { row };
    if (iPrice >= 0) {
      const raw = cells[iPrice];
      const price = raw === "" ? null : Number(raw);
      if (price !== null && (!isFinite(price) || price < 0)) {
        errors.push(`Row ${n + 2}: invalid price`);
        return;
      }
      if (price !== row.price && !(row.type === "product" && price === null)) ch.price = price;
    }
    if (iStock >= 0 && cells[iStock] !== "") {
      const stock = Number(cells[iStock]);
      if (!Number.isInteger(stock) || stock < 0) {
        errors.push(`Row ${n + 2}: invalid stock`);
        return;
      }
      if (stock !== row.stock) ch.stock = stock;
    }
    if (ch.price !== undefined || ch.stock !== undefined) changes.push(ch);
  });
  return { changes, errors };
}
