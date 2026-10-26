import { Activity, BarChart3, Boxes, ClipboardList, CreditCard, LoaderCircle } from "lucide-react";
import { FormField } from "../FormField";
import type { Report } from "../../lib/types";
import { formatMoney } from "../../lib/utils";

type ReportsViewProps = {
  report: Report | null;
  loading: boolean;
  reportFrom: string;
  reportUntil: string;
  setReportFrom: (v: string) => void;
  setReportUntil: (v: string) => void;
  onRefresh: () => void;
};

export function ReportsView({
  report,
  loading,
  reportFrom,
  reportUntil,
  setReportFrom,
  setReportUntil,
  onRefresh,
}: ReportsViewProps) {
  return (
    <>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Báo cáo tổng quan</h2><p>Số liệu được tổng hợp phía CSDL trong khoảng ngày chọn</p></div>
        </div>
        <form
          className="inline-form"
          onSubmit={(event) => { event.preventDefault(); onRefresh(); }}
        >
          <FormField label="Từ ngày">
            <input type="date" required value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
          </FormField>
          <FormField label="Đến ngày">
            <input type="date" required value={reportUntil} onChange={(event) => setReportUntil(event.target.value)} />
          </FormField>
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <BarChart3 size={16} />}
            Cập nhật báo cáo
          </button>
        </form>
      </section>
      <section className="stats-grid report-stats">
        <div className="stat-card">
          <div className="stat-icon purple"><CreditCard size={19} /></div>
          <div>
            <span>Doanh số</span>
            <strong>{formatMoney(Number(report?.sales_total ?? 0))}</strong>
            <small>Đơn xác nhận/hoàn tất, không gồm đơn hủy</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><ClipboardList size={19} /></div>
          <div>
            <span>Số đơn</span>
            <strong>{Number(report?.order_count ?? 0)}</strong>
            <small>Trong thời gian đã chọn</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><Activity size={19} /></div>
          <div>
            <span>Đã thu / còn phải thu</span>
            <strong>{formatMoney(Number(report?.paid_total ?? 0))}</strong>
            <small>Còn lại {formatMoney(Number(report?.unpaid_total ?? 0))}</small>
          </div>
        </div>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Tình hình tồn kho</h2><p>Ngưỡng cảnh báo hiện đặt ở 3 đơn vị khả dụng</p></div>
        </div>
        <div className="report-highlight">
          <Boxes size={20} />
          <strong>{Number(report?.low_stock_count ?? 0)} SKU tồn thấp</strong>
          <span>Trong kho đang chọn</span>
        </div>
      </section>
    </>
  );
}

