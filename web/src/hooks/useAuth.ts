import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { errorText } from "../lib/utils";

export type AuthUser = { id: string; email: string };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? { id: session.user.id, email: session.user.email ?? "" }
          : null,
      );
      setAuthError("");
    });

    void supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!alive) return;
        if (sessionError) setAuthError(sessionError.message);
        setUser(
          data.session?.user
            ? { id: data.session.user.id, email: data.session.user.email ?? "" }
            : null,
        );
        setAuthReady(true);
      })
      .catch((sessionError: unknown) => {
        if (!alive) return;
        setAuthError(
          errorText(sessionError, "Không kiểm tra được phiên đăng nhập."),
        );
        setAuthReady(true);
      });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
    } catch (signInError) {
      setAuthError(errorText(signInError, "Đăng nhập không thành công."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setAuthError(signOutError.message);
    } catch (signOutError) {
      setAuthError(errorText(signOutError, "Không đăng xuất được."));
    }
  }

  return { user, authReady, authBusy, authError, signIn, signOut };
}

