import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { errorText } from "../lib/utils";

export type AuthUser = { id: string; email: string; phone: string };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [passwordRecoveryComplete, setPasswordRecoveryComplete] = useState(false);

  useEffect(() => {
    let alive = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setPasswordRecoveryComplete(false);
      } else if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
        setPasswordRecoveryComplete(false);
      }
      setUser(
        session?.user
          ? {
            id: session.user.id,
            email: session.user.email ?? "",
            phone: session.user.phone ?? "",
          }
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
            ? {
              id: data.session.user.id,
              email: data.session.user.email ?? "",
              phone: data.session.user.phone ?? "",
            }
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

  async function signInWithPhone(phone: string, password: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: phone.trim(),
        password,
      });
      if (signInError) throw signInError;
      return true;
    } catch (signInError) {
      setAuthError(errorText(signInError, "Đăng nhập không thành công."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      return true;
    } catch (signInError) {
      setAuthError(errorText(signInError, "Đăng nhập không thành công."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPasswordResetEmail(email: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
      );
      if (resetError) throw resetError;
      return true;
    } catch (resetError) {
      setAuthError(errorText(resetError, "Không gửi được email đặt lại mật khẩu."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function updatePassword(password: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPasswordRecoveryComplete(true);
      return true;
    } catch (updateError) {
      setAuthError(errorText(updateError, "Không cập nhật được mật khẩu."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  function finishPasswordRecovery() {
    setPasswordRecovery(false);
    setPasswordRecoveryComplete(false);
  }

  async function cancelPasswordRecovery() {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (signOutError) {
      setAuthError(errorText(signOutError, "Không thể thoát khỏi bước đặt lại mật khẩu."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signUpWithPhone(phone: string, password: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        phone: phone.trim(),
        password,
      });
      if (signUpError) throw signUpError;
      return true;
    } catch (signUpError) {
      setAuthError(errorText(signUpError, "Không đăng ký được số điện thoại."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendPhoneOtp(phone: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;
      return true;
    } catch (otpError) {
      setAuthError(errorText(otpError, "Không gửi được mã OTP."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function verifyPhoneOtp(phone: string, token: string) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: token.trim(),
        type: "sms",
      });
      if (verifyError) throw verifyError;
      return true;
    } catch (verifyError) {
      setAuthError(errorText(verifyError, "Mã OTP không hợp lệ hoặc đã hết hạn."));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function signInWithGoogle() {
    setAuthBusy(true);
    setAuthError("");
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (oauthError) throw oauthError;
      return true;
    } catch (oauthError) {
      setAuthError(errorText(oauthError, "Không đăng nhập được bằng Google."));
      setAuthBusy(false);
      return false;
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

  return {
    user,
    authReady,
    authBusy,
    authError,
    passwordRecovery,
    passwordRecoveryComplete,
    signInWithPhone,
    signInWithEmail,
    sendPasswordResetEmail,
    updatePassword,
    finishPasswordRecovery,
    cancelPasswordRecovery,
    signUpWithPhone,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithGoogle,
    signOut,
  };
}
