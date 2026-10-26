export type ParsedInventoryCsvRow = {
  sku: string;
  quantity: string;
  sourceLine: number;
  error?: string;
};

type CsvRecord = {
  cells: string[];
  line: number;
};

function parseCsvRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let quoteClosed = false;
  let line = 1;
  let recordLine = 1;

  const pushCell = () => {
    cells.push(cell.trim());
    cell = "";
    quoteClosed = false;
  };
  const pushRecord = () => {
    pushCell();
    if (cells.some((value) => value !== "")) records.push({ cells, line: recordLine });
    cells = [];
    recordLine = line + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        cell += character;
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (character === "\r" || character === "\n") {
      pushRecord();
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      line += 1;
      recordLine = line;
      continue;
    }
    if (character === ",") {
      pushCell();
      continue;
    }
    if (character === '"') {
      if (cell.trim() !== "" || quoteClosed) {
        throw new Error(`Dấu ngoặc kép không hợp lệ ở dòng ${line}.`);
      }
      cell = "";
      quoted = true;
      continue;
    }
    if (quoteClosed && character.trim() !== "") {
      throw new Error(`Có dữ liệu sau dấu ngoặc kép ở dòng ${line}.`);
    }
    if (!quoteClosed) cell += character;
  }

  if (quoted) throw new Error(`Thiếu dấu ngoặc kép đóng ở dòng ${recordLine}.`);
  if (cells.length > 0 || cell !== "" || quoteClosed) pushRecord();
  return records;
}

export function parseInventoryCsv(text: string): ParsedInventoryCsvRow[] {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  if (records.length === 0) throw new Error("Tệp CSV không có dữ liệu.");

  const headers = records[0].cells.map((header) => header.toLocaleLowerCase("vi"));
  const skuColumn = headers.indexOf("sku");
  const quantityColumn = headers.indexOf("quantity");
  if (skuColumn < 0 || quantityColumn < 0 || skuColumn === quantityColumn) {
    throw new Error("CSV cần có hai cột tiêu đề: sku,quantity.");
  }

  const rows = records.slice(1).map(({ cells, line }): ParsedInventoryCsvRow => {
    if (cells.length !== headers.length) {
      return {
        sku: cells[skuColumn] ?? "",
        quantity: cells[quantityColumn] ?? "",
        sourceLine: line,
        error: "Số cột không khớp với tiêu đề.",
      };
    }
    return {
      sku: cells[skuColumn] ?? "",
      quantity: cells[quantityColumn] ?? "",
      sourceLine: line,
    };
  });
  if (rows.length === 0) throw new Error("CSV chỉ có tiêu đề, chưa có dòng SKU nào.");
  if (rows.length > 200) throw new Error("Mỗi lần chỉ nhập tối đa 200 dòng CSV.");
  return rows;
}
