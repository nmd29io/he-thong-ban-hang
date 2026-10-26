import { Users } from "lucide-react";
import { FormField } from "../FormField";
import type { Membership, Role } from "../../lib/types";
import { roleNames } from "../../lib/types";
import { formatDate } from "../../lib/utils";
import type { UseFormReturn } from "react-hook-form";

type MembershipFormData = {
  memberUserId: string;
  memberRole: Role;
};

type AccessViewProps = {
  members: Membership[];
  form: UseFormReturn<MembershipFormData>;
  handleMembership: (data: MembershipFormData) => void;
};

export function AccessView({ members, form, handleMembership }: AccessViewProps) {
  const { register, handleSubmit } = form;

  return (
    <>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Thêm hoặc cập nhật thành viên</h2><p>Nhập UUID tài khoản đã đăng ký trong Supabase Auth</p></div>
        </div>
        <form className="data-form form-grid" onSubmit={(e) => void handleSubmit(handleMembership)(e)}>
          <FormField label="UUID người dùng">
            <input required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...register("memberUserId")} />
          </FormField>
          <FormField label="Vai trò">
            <select {...register("memberRole")}>
              {Object.entries(roleNames).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
          </FormField>
          <button className="button button-primary" type="submit"><Users size={16} /> Lưu quyền</button>
        </form>
        <p className="helper-copy">
          Để bảo vệ cửa hàng, thành viên đầu tiên phải được khởi tạo bởi quản trị viên CSDL.
          Vai trò chủ cửa hàng cuối cùng không thể bị gỡ.
        </p>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div><h2>Thành viên hiện tại</h2><p>Chỉ chủ cửa hàng và quản lý được xem danh sách đầy đủ</p></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>UUID</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tham gia</th></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.user_id}>
                  <td className="order-number">{member.user_id}</td>
                  <td>{roleNames[member.role as Role] ?? member.role}</td>
                  <td>{member.is_active ? "Đang hoạt động" : "Đã khóa"}</td>
                  <td>{formatDate(member.created_at)}</td>
                </tr>
              ))}
              {members.length === 0 && <tr><td colSpan={4} className="table-empty">Chưa tải được thành viên.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

