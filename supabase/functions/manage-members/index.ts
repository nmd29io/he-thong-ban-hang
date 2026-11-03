import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const roles = ["owner", "manager", "cashier", "stock_clerk", "accountant"];
const permissions = [
  "sales.create",
  "orders.read",
  "orders.manage",
  "payments.read",
  "payments.manage",
  "customers.read",
  "customers.manage",
  "products.read",
  "products.manage",
  "inventory.read",
  "inventory.manage",
  "reports.read",
  "members.manage",
];
const pageSize = 100;
const maxPages = 1000;
type MemberRole = "owner" | "manager" | "cashier" | "stock_clerk" | "accountant";
type Permission =
  | "sales.create"
  | "orders.read"
  | "orders.manage"
  | "payments.read"
  | "payments.manage"
  | "customers.read"
  | "customers.manage"
  | "products.read"
  | "products.manage"
  | "inventory.read"
  | "inventory.manage"
  | "reports.read"
  | "members.manage";
type AuthRecord = {
  id?: unknown;
  email?: unknown;
  phone?: unknown;
  email_confirmed_at?: unknown;
  phone_confirmed_at?: unknown;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(value);
}

function isRole(value: unknown): value is MemberRole {
  return typeof value === "string" && roles.includes(value);
}

function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && permissions.includes(value);
}

function normalizeContact(type: "email" | "phone", value: string): string | null {
  const contact = value.trim();
  if (type === "email") {
    const normalized = contact.toLowerCase();
    return normalized.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
      ? normalized
      : null;
  }
  return /^\+[1-9]\d{7,14}$/.test(contact) ? contact : null;
}

async function findAuthUser(
  supabaseAdmin: {
    auth: {
      admin: {
        listUsers: (options: { page: number; perPage: number }) => Promise<{
          data: { users: AuthRecord[] } | null;
          error: { message: string } | null;
        }>;
      };
    };
  },
  type: "email" | "phone",
  contact: string,
) {
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (error) throw new Error(`Không thể tra cứu tài khoản Auth: ${error.message}`);
    const users = data?.users ?? [];
    const matched = users.find((user) => {
      const current = type === "email" ? user.email : user.phone;
      const confirmed = type === "email" ? user.email_confirmed_at : user.phone_confirmed_at;
      return typeof current === "string" &&
        current.toLowerCase() === contact &&
        typeof confirmed === "string";
    });
    if (matched) return matched;
    if (users.length < pageSize) return null;
  }
  throw new Error("Danh sách tài khoản vượt giới hạn tra cứu an toàn.");
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Chỉ hỗ trợ POST." }, 405);
    }

    const actorId = ctx.userClaims?.id;
    if (!actorId) return jsonResponse({ error: "Chưa đăng nhập." }, 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "JSON không hợp lệ." }, 400);
    }
    if (!isRecord(body) || !isUuid(body.store_id)) {
      return jsonResponse({ error: "Thông tin cửa hàng hoặc yêu cầu không hợp lệ." }, 400);
    }
    if (body.action !== "list" && body.action !== "set") {
      return jsonResponse({ error: "Thao tác không được hỗ trợ." }, 400);
    }

    const { data: actorMembership, error: actorError } = await ctx.supabaseAdmin
      .from("store_memberships")
      .select("role")
      .eq("store_id", body.store_id)
      .eq("user_id", actorId)
      .eq("is_active", true)
      .maybeSingle();
    if (actorError) {
      console.error("Owner membership lookup failed:", actorError.message);
      return jsonResponse({ error: "Không xác minh được quyền chủ cửa hàng." }, 500);
    }
    if (actorMembership?.role !== "owner") {
      return jsonResponse({ error: "Chỉ chủ cửa hàng được quản lý thành viên." }, 403);
    }

    if (body.action === "set") {
      const contactType = body.contact_type;
      const requestedContact = body.contact;
      const role = body.role;
      const requestedPermissions = body.permissions;
      if (
        (contactType !== "email" && contactType !== "phone") ||
        typeof requestedContact !== "string" ||
        !isRole(role) ||
        !Array.isArray(requestedPermissions) ||
        !requestedPermissions.every(isPermission)
      ) {
        return jsonResponse({ error: "Thông tin tài khoản, vai trò hoặc quyền không hợp lệ." }, 400);
      }

      const contact = normalizeContact(contactType, requestedContact);
      if (!contact) {
        return jsonResponse({
          error: contactType === "email"
            ? "Email không hợp lệ."
            : "Số điện thoại phải theo định dạng quốc tế, ví dụ +84901234567.",
        }, 400);
      }

      let authUser: AuthRecord | null;
      try {
        authUser = await findAuthUser(ctx.supabaseAdmin, contactType, contact);
      } catch (lookupError) {
        console.error("Auth account lookup failed:", lookupError);
        return jsonResponse({ error: "Không tra cứu được tài khoản. Vui lòng thử lại." }, 500);
      }
      if (!authUser || typeof authUser.id !== "string" || !isUuid(authUser.id)) {
        return jsonResponse({
          error: "Không tìm thấy tài khoản đã xác thực bằng thông tin này. Nhân viên cần đăng ký trước.",
        }, 404);
      }

      const { error: setError } = await ctx.supabaseAdmin.rpc("set_store_membership", {
        p_actor_id: actorId,
        p_store_id: body.store_id,
        p_user_id: authUser.id,
        p_role: role,
        p_permissions: [...new Set(requestedPermissions)],
        p_is_active: true,
      });
      if (setError) {
        console.error("Membership update failed:", setError.code, setError.message);
        if (setError.code === "42501") {
          return jsonResponse({ error: "Chỉ chủ cửa hàng được quản lý thành viên." }, 403);
        }
        return jsonResponse({ error: "Không lưu được thành viên hoặc quyền đã chọn." }, 400);
      }
      return jsonResponse({ success: true });
    }

    const { data: memberRows, error: membersError } = await ctx.supabaseAdmin
      .from("store_memberships")
      .select("user_id,role,permissions,is_active,created_at")
      .eq("store_id", body.store_id)
      .order("created_at");
    if (membersError) {
      console.error("Store member list failed:", membersError.message);
      return jsonResponse({ error: "Không tải được danh sách thành viên." }, 500);
    }

    const members = memberRows ?? [];
    const pendingIds = new Set(members.map((member) => member.user_id));
    const contacts = new Map<string, { email: string | null; phone: string | null }>();
    for (let page = 1; page <= maxPages && pendingIds.size > 0; page += 1) {
      const { data, error } = await ctx.supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });
      if (error) {
        console.error("Member contact lookup failed:", error.message);
        return jsonResponse({ error: "Không tải được thông tin liên hệ thành viên." }, 500);
      }
      const users = data?.users ?? [];
      for (const user of users) {
        if (typeof user.id !== "string" || !pendingIds.has(user.id)) continue;
        contacts.set(user.id, {
          email: typeof user.email === "string" ? user.email : null,
          phone: typeof user.phone === "string" ? user.phone : null,
        });
        pendingIds.delete(user.id);
      }
      if (users.length < pageSize) break;
      if (page === maxPages && pendingIds.size > 0) {
        return jsonResponse({ error: "Danh sách thành viên vượt giới hạn tra cứu an toàn." }, 500);
      }
    }

    return jsonResponse({
      members: members.flatMap((member) => {
        const contact = contacts.get(member.user_id);
        const value = contact?.email ?? contact?.phone;
        if (!value) return [];
        return [{
          contact: value,
          contact_type: contact?.email ? "email" : "phone",
          role: member.role,
          permissions: member.permissions,
          is_active: member.is_active,
          created_at: member.created_at,
        }];
      }),
    });
  }),
};
