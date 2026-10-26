import { supabase } from "./supabase";

function isErrorPayload(value: unknown): value is { error: string } {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string";
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const payload: unknown = await error.context.clone().json();
        if (isErrorPayload(payload)) message = payload.error;
      } catch {
        message = error.message;
      }
    }
    throw new Error(message);
  }
  if (data === null) {
    throw new Error(`Hàm ${name} không trả về dữ liệu.`);
  }
  return data;
}
