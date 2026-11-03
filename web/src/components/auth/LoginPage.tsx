import { useState } from "react";
import { KeyRound, LoaderCircle, LogIn, Phone, Store } from "lucide-react";
import { FormField } from "../FormField";

type LoginPageProps = {
  authError: string;
  authBusy: boolean;
  onSignInWithPhone: (phone: string, password: string) => Promise<boolean>;
  onSignInWithEmail: (email: string, password: string) => Promise<boolean>;
  onSignUpWithPhone: (phone: string, password: string) => Promise<boolean>;
  onSendPhoneOtp: (phone: string) => Promise<boolean>;
  onVerifyPhoneOtp: (phone: string, token: string) => Promise<boolean>;
  onSignInWithGoogle: () => Promise<boolean>;
};

const e164PhonePattern = /^\+[1-9]\d{7,14}$/;

export function LoginPage({
  authError,
  authBusy,
  onSignInWithPhone,
  onSignInWithEmail,
  onSignUpWithPhone,
  onSendPhoneOtp,
  onVerifyPhoneOtp,
  onSignInWithGoogle,
}: LoginPageProps) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [isRegistering, setIsRegistering] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [formError, setFormError] = useState("");

  function validatePhone() {
    if (!e164PhonePattern.test(phone.trim())) {
      setFormError("Nhập số điện thoại theo định dạng quốc tế, ví dụ +84901234567.");
      return false;
    }
    setFormError("");
    return true;
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validatePhone()) return;
    if (password.length < 8) {
      setFormError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setFormError("");
    if (isRegistering) {
      if (await onSignUpWithPhone(phone.trim(), password)) setOtpPending(true);
    } else {
      await onSignInWithPhone(phone.trim(), password);
    }
  }

  async function requestOtp() {
    if (!validatePhone()) return;
    setFormError("");
    if (await onSendPhoneOtp(phone.trim())) setOtpPending(true);
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4,10}$/.test(token.trim())) {
      setFormError("Nhập mã OTP gồm 4 đến 10 chữ số.");
      return;
    }
    setFormError("");
    if (await onVerifyPhoneOtp(phone.trim(), token.trim())) setOtpPending(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo"><Store size={25} /></div>
        <h1>Đăng nhập nhân viên</h1>
        <p>Đăng nhập bằng Google hoặc số điện thoại đã xác thực.</p>
        {(authError || formError) && (
          <div className="error-banner" role="alert">{formError || authError}</div>
        )}
        <button
          className="button button-secondary"
          type="button"
          onClick={() => void onSignInWithGoogle()}
          disabled={authBusy}
        >
          {authBusy ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
          Tiếp tục với Google
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSignInWithEmail(email, emailPassword);
          }}
        >
          <FormField label="Email">
            <input
              autoComplete="username"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
          <FormField label="Mật khẩu email">
            <input
              autoComplete="current-password"
              type="password"
              required
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </FormField>
          <button className="button button-secondary" type="submit" disabled={authBusy}>
            {authBusy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
            Đăng nhập email
          </button>
        </form>
        <div className="auth-divider"><span>hoặc bằng số điện thoại</span></div>
        {otpPending ? (
          <form onSubmit={(event) => void verifyOtp(event)}>
            <FormField label={`Mã OTP gửi tới ${phone}`}>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </FormField>
            <button className="button button-primary" type="submit" disabled={authBusy}>
              {authBusy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
              Xác nhận mã
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setOtpPending(false);
                setToken("");
              }}
            >
              Đổi số điện thoại
            </button>
          </form>
        ) : (
          <>
            <div className="auth-mode-switch" role="group" aria-label="Phương thức điện thoại">
              <button
                className={mode === "password" ? "active" : ""}
                type="button"
                onClick={() => {
                  setMode("password");
                  setIsRegistering(false);
                }}
              >
                Mật khẩu
              </button>
              <button
                className={mode === "otp" ? "active" : ""}
                type="button"
                onClick={() => setMode("otp")}
              >
                Mã OTP
              </button>
            </div>
            <FormField label="Số điện thoại (mã quốc gia)">
              <input
                autoComplete="tel"
                type="tel"
                placeholder="+84901234567"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </FormField>
            {mode === "password" ? (
              <form onSubmit={(event) => void submitPassword(event)}>
                <FormField label="Mật khẩu">
                  <input
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    minLength={8}
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormField>
                <button className="button button-primary" type="submit" disabled={authBusy}>
                  {authBusy ? <LoaderCircle className="spin" size={17} /> : <Phone size={17} />}
                  {isRegistering ? "Đăng ký bằng số điện thoại" : "Đăng nhập"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setIsRegistering((current) => !current)}
                >
                  {isRegistering ? "Đã có tài khoản? Đăng nhập" : "Tạo tài khoản bằng số điện thoại"}
                </button>
              </form>
            ) : (
              <button className="button button-primary" type="button" onClick={() => void requestOtp()} disabled={authBusy}>
                {authBusy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
                Gửi mã OTP / đăng ký
              </button>
            )}
          </>
        )}
        <p className="helper-copy">Tài khoản mới cần được chủ cửa hàng cấp quyền trước khi truy cập dữ liệu.</p>
      </section>
    </main>
  );
}
