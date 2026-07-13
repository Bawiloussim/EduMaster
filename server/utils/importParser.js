const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');

function cellToString(cell) {
  let value = cell.value;
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ('text' in value) value = value.text;
    else if ('result' in value) value = value.result;
    else if (Array.isArray(value.richText)) value = value.richText.map((t) => t.text).join('');
  }
  return value == null ? '' : String(value).trim();
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim().toLowerCase();
  });

  const rows = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const obj = {};
    let hasValue = false;
    headers.forEach((header, colNumber) => {
      if (!header) return;
      const value = cellToString(row.getCell(colNumber));
      if (value) hasValue = true;
      obj[header] = value;
    });
    if (hasValue) rows.push(obj);
  }
  return rows;
}

// Normalizes both CSV and Excel uploads into the same array of
// lowercase-header row objects consumed by importController.
async function parseImportFile(buffer, originalname) {
  if (/\.xlsx$/i.test(originalname)) return parseExcel(buffer);
  return parse(buffer, { columns: (header) => header.map((h) => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });
}

module.exports = { parseImportFile };
