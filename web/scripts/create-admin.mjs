import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const defaultEmail = "admin@tenmiencuahang.vn";
const pageSize = 100;
const ownerPermissions = [
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

function parseArguments(args) {
  let email = defaultEmail;
  let storeCode = "";

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--store-code") {
      storeCode = args[index + 1]?.trim() ?? "";
      if (!storeCode) throw new Error("Thiếu mã cửa hàng sau --store-code.");
      index += 1;
    } else if (argument.startsWith("--")) {
      throw new Error(`Tùy chọn không được hỗ trợ: ${argument}`);
    } else {
      email = argument.trim().toLowerCase();
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email không hợp lệ. Hãy truyền email sau lệnh seed:admin.");
  }

  return { email, storeCode };
}

async function promptHidden(prompt) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new Error("Cần chạy script trong terminal tương tác để nhập bí mật an toàn.");
  }

  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    let value = "";
    const previousRawMode = input.isRaw;

    function cleanup() {
      input.off("data", onData);
      input.setRawMode(previousRawMode);
      process.stdout.write("\n");
    }

    function onData(chunk) {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Đã hủy thao tác."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    }

    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function getSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;

  const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
  let envContents;
  try {
    envContents = await readFile(envPath, "utf8");
  } catch (error) {
    throw new Error(`Không đọc được web/.env.local: ${error.message}`);
  }

  const match = envContents.match(/^\s*VITE_SUPABASE_URL\s*=\s*(.*?)\s*$/m);
  const url = match?.[1]?.replace(/^["']|["']$/g, "");
  if (!url) {
    throw new Error("Thiếu VITE_SUPABASE_URL trong web/.env.local hoặc SUPABASE_URL.");
  }
  return url;
}

async function findUserIdByEmail(supabase, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (error) throw new Error(`Không tìm được tài khoản Auth: ${error.message}`);

    const user = data.users.find((entry) => entry.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < pageSize) return null;
  }
}

async function getStore(supabase, storeCode) {
  let query = supabase.from("stores").select("id,code").eq("is_active", true);
  if (storeCode) {
    query = query.eq("code", storeCode);
  }

  const { data: stores, error } = await query;
  if (error) throw new Error(`Không tải được cửa hàng: ${error.message}`);
  if (stores.length === 1) return stores[0];
  if (stores.length === 0) {
    throw new Error(
      storeCode
        ? `Không tìm thấy cửa hàng đang hoạt động có mã "${storeCode}".`
        : "Không có cửa hàng đang hoạt động. Hãy tạo cửa hàng trước.",
    );
  }
  throw new Error(
    "Có nhiều cửa hàng đang hoạt động. Chạy lại với --store-code <mã-cửa-hàng>.",
  );
}

async function main() {
  const { email, storeCode } = parseArguments(process.argv.slice(2));
  const supabaseUrl = await getSupabaseUrl();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (await promptHidden("Nhập Supabase service_role key (không hiển thị): "));
  if (!serviceRoleKey.trim()) throw new Error("Service role key không được để trống.");

  const supabase = createClient(supabaseUrl, serviceRoleKey.trim(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const store = await getStore(supabase, storeCode);

  let userId = await findUserIdByEmail(supabase, email);
  if (userId) {
    console.log(`Tài khoản ${email} đã tồn tại; giữ nguyên mật khẩu hiện tại.`);
  } else {
    const password = await promptHidden("Tạo mật khẩu cho admin (không hiển thị): ");
    const passwordConfirmation = await promptHidden("Nhập lại mật khẩu: ");
    if (password.length < 8) {
      throw new Error("Mật khẩu phải có ít nhất 8 ký tự.");
    }
    if (password !== passwordConfirmation) {
      throw new Error("Hai lần nhập mật khẩu không khớp.");
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "admin" },
    });
    if (error) throw new Error(`Không tạo được tài khoản Auth: ${error.message}`);
    userId = data.user.id;
  }

  const { error: membershipError } = await supabase
    .from("store_memberships")
    .upsert(
      {
        store_id: store.id,
        user_id: userId,
        role: "owner",
        permissions: ownerPermissions,
        is_active: true,
      },
      { onConflict: "store_id,user_id" },
    );
  if (membershipError) {
    throw new Error(
      `Tài khoản ${email} đã có trong Auth nhưng chưa được cấp quyền owner: ${membershipError.message}`,
    );
  }

  console.log(`Đã cấp quyền owner cho ${email} tại cửa hàng ${store.code}.`);
}

main().catch((error) => {
  console.error(`Không thể tạo admin: ${error.message}`);
  process.exitCode = 1;
});
