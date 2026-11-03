import { LoaderCircle, ShieldCheck, Users } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { FormField } from "../FormField";
import {
  permissionKeys,
  permissionLabels,
  rolePermissionPresets,
} from "../../lib/permissions";
import type { Permission } from "../../lib/permissions";
import type { Role } from "../../lib/types";
import { roleNames } from "../../lib/permissions";
import { formatDate } from "../../lib/utils";
import type { AccessFormData, AccessMember } from "../../hooks/useAccess";

type AccessViewProps = {
  members: AccessMember[];
  loading: boolean;
  loadError: string;
  form: UseFormReturn<AccessFormData>;
  handleMembership: (data: AccessFormData) => void;
};

export function AccessView({ members, loading, loadError, form, handleMembership }: AccessViewProps) {
  const { register, handleSubmit, watch, setValue } = form;
  const contactType = watch("contactType");
  const memberRole = watch("memberRole");
  const selectedPermissions = watch("permissions") ?? [];

  function changeRole(role: Role) {
    setValue("memberRole", role, { shouldDirty: true });
    setValue("permissions", rolePermissionPresets[role], { shouldDirty: true });
  }

  return (
    <>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div>
            <h2>Thêm hoặc cập nhật thành viên</h2>
            <p>Nhập email Google hoặc số điện thoại đã đăng ký; không cần UUID.</p>
          </div>
        </div>
        {loadError && <div className="error-banner" role="alert">{loadError}</div>}
        <form className="data-form form-grid" onSubmit={(event) => void handleSubmit(handleMembership)(event)}>
          <FormField label="Tìm tài khoản bằng">
            <select {...register("contactType", { required: true })}>
              <option value="email">Email</option>
              <option value="phone">Số điện thoại</option>
            </select>
          </FormField>
          <FormField label={contactType === "email" ? "Email Google" : "Số điện thoại (mã quốc gia)"}>
            <input
              autoComplete="off"
              type={contactType === "email" ? "email" : "tel"}
              placeholder={contactType === "email" ? "nhanvien@gmail.com" : "+84901234567"}
              required
              {...register("contact")}
            />
          </FormField>
          <FormField label="Vai trò mẫu">
            <select value={memberRole} onChange={(event) => changeRole(event.target.value as Role)}>
              {Object.entries(roleNames).map(([role, label]) => (
                <option key={role} value={role}>{label}</option>
              ))}
            </select>
          </FormField>
          <fieldset className="permission-fieldset">
            <legend>Quyền riêng cho nhân viên</legend>
            <p className="helper-copy">Chọn chính xác các thao tác được phép. Vai trò chủ cửa hàng luôn có toàn quyền. Có thể chọn lại mẫu vai trò để khôi phục mặc định.</p>
            <button
              className="text-button"
              type="button"
              onClick={() => setValue("permissions", rolePermissionPresets[memberRole], { shouldDirty: true })}
            >
              Khôi phục quyền theo vai trò mẫu
            </button>
            <div className="permission-grid">
              {permissionKeys.map((permission) => (
                <label key={permission} className="permission-option">
                  <input
                    type="checkbox"
                    value={permission}
                    disabled={memberRole === "owner" || permission === "members.manage"}
                    {...register("permissions", {
                      validate: (values) => values.every((value) =>
                        (permissionKeys as readonly string[]).includes(value)
                      ),
                    })}
                  />
                  <span>{permissionLabels[permission as Permission]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
            Lưu thành viên và quyền
          </button>
        </form>
        <p className="helper-copy">
          Chỉ tài khoản đã đăng ký mới được cấp quyền. Cấu hình Google OAuth và nhà cung cấp SMS được thực hiện một lần trong Supabase.
        </p>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading">
          <div>
            <h2>Thành viên hiện tại</h2>
            <p>Chủ cửa hàng có thể cập nhật quyền bằng email hoặc số điện thoại ở trên.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Tài khoản</th><th>Vai trò mẫu</th><th>Quyền riêng</th><th>Trạng thái</th><th>Ngày tham gia</th><th></th></tr></thead>
            <tbody>
              {members.map((member) => (
                <tr key={`${member.contact_type}-${member.contact}`}>
                  <td>{member.contact}</td>
                  <td>{roleNames[member.role] ?? member.role}</td>
                  <td>{member.permissions.length ? member.permissions.map((permission) => permissionLabels[permission]).join(", ") : "Không có quyền"}</td>
                  <td>{member.is_active ? "Đang hoạt động" : "Đã khóa"}</td>
                  <td>{formatDate(member.created_at)}</td>
                  <td>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        form.reset({
                          contactType: member.contact_type,
                          contact: member.contact,
                          memberRole: member.role,
                          permissions: member.permissions,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Sửa quyền
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={6} className="table-empty">{loading ? "Đang tải thành viên..." : "Chưa có thành viên."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="helper-copy"><Users size={14} /> {selectedPermissions.length} quyền đang được chọn cho mẫu {roleNames[memberRole]}.</p>
      </section>
    </>
  );
}
