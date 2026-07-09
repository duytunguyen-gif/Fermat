import * as XLSX from "xlsx";
import { formatVnTime, formatVnDate, formatWorkHours } from "@/lib/constants/attendance";

/** Một dòng chấm công dùng để xuất báo cáo. */
export type ExportRow = {
  user_name: string;
  real_name: string | null;
  dept_name: string | null;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | null;
  is_late: boolean;
  note: string | null;
};

export type ExportOptions = {
  /** Dùng cho tên file, VD "2026-07". */
  fileLabel: string;
  /** Nhãn kỳ báo cáo hiển thị trong tiêu đề, VD "Tháng 7/2026". */
  periodLabel: string;
};

const COMPANY = "Fermat Tech";
const HEADERS = [
  "Nhân viên",
  "Tên thật",
  "Phòng ban",
  "Ngày",
  "Giờ vào",
  "Giờ ra",
  "Tổng giờ",
  "Trạng thái",
  "Ghi chú",
] as const;

function statusText(r: ExportRow): string {
  return r.check_in_at ? (r.is_late ? "Đi trễ" : "Đúng giờ") : "—";
}

/** Chuyển 1 dòng thành mảng ô theo đúng thứ tự HEADERS. */
function toCells(r: ExportRow): (string | number)[] {
  return [
    r.user_name,
    r.real_name ?? "",
    r.dept_name ?? "",
    formatVnDate(r.work_date),
    formatVnTime(r.check_in_at),
    formatVnTime(r.check_out_at),
    formatWorkHours(r.work_hours),
    statusText(r),
    r.note ?? "",
  ];
}

function totals(rows: ExportRow[]) {
  const totalHours = rows.reduce((s, r) => s + (r.work_hours ?? 0), 0);
  const late = rows.filter((r) => r.is_late).length;
  return { totalHours, late };
}

/**
 * Xuất file Excel (.xlsx) có tiêu đề, dòng thông tin kỳ báo cáo, bộ lọc tự động
 * ở dòng tiêu đề cột và dòng tổng cộng ở cuối. (SheetJS bản cộng đồng không tô
 * màu ô được, nên tập trung vào bố cục rõ ràng.)
 */
export function exportAttendanceExcel(rows: ExportRow[], opts: ExportOptions) {
  const nCols = HEADERS.length;
  const { totalHours, late } = totals(rows);
  const exportedAt = new Date().toLocaleString("vi-VN");

  const blankRow = Array(nCols).fill("");
  const titleRow = ["BẢNG CHẤM CÔNG", ...Array(nCols - 1).fill("")];
  const subRow = [
    `${COMPANY} · ${opts.periodLabel} · Xuất lúc ${exportedAt}`,
    ...Array(nCols - 1).fill(""),
  ];
  const summaryRow = [
    `Tổng cộng: ${rows.length} dòng`,
    "",
    "",
    "",
    "",
    "",
    formatWorkHours(totalHours),
    `${late} buổi trễ`,
    "",
  ];

  const aoa = [
    titleRow,
    subRow,
    blankRow,
    [...HEADERS],
    ...rows.map(toCells),
    blankRow,
    summaryRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Gộp ô cho tiêu đề + dòng thông tin.
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: nCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: nCols - 1 } },
  ];

  // Độ rộng cột.
  ws["!cols"] = [
    { wch: 24 }, // Nhân viên
    { wch: 24 }, // Tên thật
    { wch: 20 }, // Phòng ban
    { wch: 18 }, // Ngày
    { wch: 9 }, // Giờ vào
    { wch: 9 }, // Giờ ra
    { wch: 10 }, // Tổng giờ
    { wch: 11 }, // Trạng thái
    { wch: 32 }, // Ghi chú
  ];

  // Chiều cao dòng tiêu đề cho thoáng.
  ws["!rows"] = [{ hpt: 22 }, { hpt: 16 }];

  // Bộ lọc tự động trên dòng tiêu đề cột (dòng 4, chỉ số 3) + dữ liệu.
  const headerRowIdx = 3;
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range(
      { r: headerRowIdx, c: 0 },
      { r: headerRowIdx + rows.length, c: nCols - 1 },
    ),
  };

  // Cố định vùng tiêu đề khi cuộn.
  ws["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Chấm công");
  XLSX.writeFile(wb, `cham-cong-${opts.fileLabel}.xlsx`);
}

/**
 * Xuất PDF qua hộp thoại in của trình duyệt (chọn "Lưu thành PDF").
 * Tránh nhúng font để hiển thị tiếng Việt chuẩn — dùng chính font hệ thống.
 * Bố cục có dải tiêu đề thương hiệu, các thẻ tổng hợp và bảng kẻ sọc.
 */
export function exportAttendancePdf(rows: ExportRow[], opts: ExportOptions) {
  const esc = (s: string) =>
    s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

  const { totalHours, late } = totals(rows);
  const onTime = rows.filter((r) => r.check_in_at && !r.is_late).length;
  const exportedAt = new Date().toLocaleString("vi-VN");
  const logo =
    typeof window !== "undefined"
      ? `${window.location.origin}/brand/logo-fermat.jpg`
      : "";

  const head = HEADERS.map(
    (h, i) => `<th class="${i >= 4 && i <= 7 ? "c" : ""}">${esc(h)}</th>`,
  ).join("");

  const body = rows
    .map((r, idx) => {
      const cells = toCells(r);
      const st = statusText(r);
      const stCls =
        st === "Đi trễ" ? "late" : st === "Đúng giờ" ? "ontime" : "muted";
      const tds = cells
        .map((v, i) => {
          if (i === 7) {
            return `<td class="c"><span class="badge ${stCls}">${esc(String(v))}</span></td>`;
          }
          const cls = i >= 4 && i <= 6 ? "c num" : "";
          return `<td class="${cls}">${esc(String(v))}</td>`;
        })
        .join("");
      return `<tr class="${idx % 2 ? "alt" : ""}">${tds}</tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
    <title>Bảng chấm công — ${esc(opts.periodLabel)}</title>
    <style>
      * { box-sizing: border-box; font-family: "Segoe UI", Roboto, Arial, sans-serif; }
      body { margin: 0; color: #111827; }
      .head { display: flex; align-items: center; gap: 14px; padding: 4px 0 14px; border-bottom: 3px solid #2563eb; }
      .head img { height: 46px; width: auto; }
      .head .t h1 { font-size: 18px; margin: 0; letter-spacing: .3px; }
      .head .t p { margin: 2px 0 0; color: #6b7280; font-size: 12px; }
      .head .co { margin-left: auto; text-align: right; color: #2563eb; font-weight: 700; font-size: 14px; }
      .cards { display: flex; gap: 10px; margin: 14px 0; }
      .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; }
      .card .n { font-size: 20px; font-weight: 700; }
      .card .l { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .4px; }
      table { border-collapse: collapse; width: 100%; font-size: 11px; }
      th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: middle; }
      th { background: #2563eb; color: #fff; font-weight: 600; }
      th.c, td.c { text-align: center; }
      td.num { font-variant-numeric: tabular-nums; }
      tr.alt td { background: #f8fafc; }
      .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
      .badge.late { background: #fef3c7; color: #b45309; }
      .badge.ontime { background: #dcfce7; color: #15803d; }
      .badge.muted { color: #9ca3af; }
      .foot { margin-top: 10px; font-size: 11px; color: #6b7280; text-align: right; }
      @media print { @page { size: A4 landscape; margin: 12mm; } .cards { break-inside: avoid; } tr { break-inside: avoid; } }
    </style></head><body>
    <div class="head">
      ${logo ? `<img src="${logo}" alt="">` : ""}
      <div class="t">
        <h1>BẢNG CHẤM CÔNG</h1>
        <p>${esc(opts.periodLabel)} · Xuất lúc ${esc(exportedAt)}</p>
      </div>
      <div class="co">${COMPANY}</div>
    </div>
    <div class="cards">
      <div class="card"><div class="n">${rows.length}</div><div class="l">Bản ghi</div></div>
      <div class="card"><div class="n">${esc(formatWorkHours(totalHours))}</div><div class="l">Tổng giờ làm</div></div>
      <div class="card"><div class="n">${onTime}</div><div class="l">Lượt đúng giờ</div></div>
      <div class="card"><div class="n">${late}</div><div class="l">Lượt đi trễ</div></div>
    </div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="foot">Báo cáo tạo tự động từ hệ thống quản lý ${COMPANY}.</p>
    </body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}
