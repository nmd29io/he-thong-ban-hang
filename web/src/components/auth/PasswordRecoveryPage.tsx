import { useState } from "react";
import { ArrowLeft, KeyRound, LoaderCircle, MailCheck, Store } from "lucide-react";
import { FormField } from "../FormField";

type PasswordRecoveryPageProps = {
  authBusy: boolean;
  authError: string;
  complete: boolean;
  onUpdatePassword: (password: string) => Promise<boolean>;
  onContinue: () => void;
  onCancel: () => void;
};

export function PasswordRecoveryPage({
  authBusy,
  authError,
  complete,
  onUpdatePassword,
  onContinue,
  onCancel,
}: PasswordRecoveryPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setFormError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Hai mật khẩu nhập lại không khớp.");
      return;
    }
    setFormError("");
    await onUpdatePassword(password);
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          {complete ? <MailCheck size={25} /> : <Store size={25} />}
        </div>
        <h1>{complete ? "Đã đổi mật khẩu" : "Đặt mật khẩu mới"}</h1>
        <p>
          {complete
            ? "Mật khẩu của bạn đã được cập nhật. Tiếp tục để vào hệ thống."
            : "Nhập mật khẩu mới cho tài khoản của bạn."}
        </p>
        {(authError || formError) && (
          <div className="error-banner" role="alert">{formError || authError}</div>
        )}
        {complete ? (
          <button className="button button-primary" type="button" onClick={onContinue}>
            Tiếp tục
          </button>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <FormField label="Mật khẩu mới">
              <input
                autoComplete="new-password"
                minLength={8}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormField>
            <FormField label="Nhập lại mật khẩu mới">
              <input
                autoComplete="new-password"
                minLength={8}
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </FormField>
            <button className="button button-primary" type="submit" disabled={authBusy}>
              {authBusy ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />}
              Cập nhật mật khẩu
            </button>
            <button
              className="text-button"
              type="button"
              disabled={authBusy}
              onClick={onCancel}
            >
              <ArrowLeft size={15} /> Quay lại đăng nhập
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
