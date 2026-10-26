import { LogIn, LoaderCircle, Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { FormField } from "../FormField";

type LoginFormData = {
  email: string;
  password: string;
};

type LoginPageProps = {
  authError: string;
  authBusy: boolean;
  onSignIn: (email: string, password: string) => void;
};

export function LoginPage({ authError, authBusy, onSignIn }: LoginPageProps) {
  const { register, handleSubmit } = useForm<LoginFormData>({
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(data: LoginFormData) {
    onSignIn(data.email, data.password);
  }

  return (
    <main className="auth-page">
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="auth-card">
        <div className="auth-logo"><Store size={25} /></div>
        <h1>Đăng nhập nhân viên</h1>
        <p>Đăng nhập bằng tài khoản đã được cửa hàng cấp quyền.</p>
        {authError && <div className="error-banner" role="alert">{authError}</div>}
        <FormField label="Email">
          <input type="email" autoComplete="username" required {...register("email")} />
        </FormField>
        <FormField label="Mật khẩu">
          <input type="password" autoComplete="current-password" required {...register("password")} />
        </FormField>
        <button className="button button-primary" type="submit" disabled={authBusy}>
          {authBusy ? <LoaderCircle className="spin" size={17} /> : <LogIn size={17} />}
          {authBusy ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

