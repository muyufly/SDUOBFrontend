import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { api, errorMessage } from "@/api/client";
import type { AuthSession } from "@/api/types";
import { useAuth } from "@/app/auth";
import { Spinner } from "@/components/common";
const schema = z.object({
  username: z
    .string()
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]{2,23}$/,
      "用户名需以字母开头，3–24 位字母、数字或下划线",
    ),
  password: z.string().min(8, "密码至少 8 位").max(128, "密码最多 128 位"),
  displayName: z.string().max(40, "昵称最多 40 字").optional(),
});
export function AuthPage() {
  const location = useLocation();
  const registering = location.pathname === "/register";
  const nav = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuth();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    if (registering && !values.displayName?.trim()) {
      setError("写下一个你喜欢的昵称。");
      return;
    }
    try {
      const session = await api<AuthSession>(
        registering ? "/auth/register" : "/auth/login",
        {
          method: "POST",
          anonymous: true,
          body: registering
            ? { ...values, displayName: values.displayName!.trim() }
            : { username: values.username, password: values.password },
        },
      );
      auth.login(session);
      const next = params.get("next") || "/studio";
      nav(next.startsWith("/") && !next.startsWith("//") ? next : "/studio", {
        replace: true,
      });
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <img
          src="/brand/qian-ai-mark.png"
          width={48}
          height={48}
          alt=""
          aria-hidden="true"
        />
        <h1>
          每一个想法，
          <br />
          都值得有一页。
        </h1>
        <p>
          学习的新发现，生活的小瞬间。
          <br />
          让文字成为你与世界的连接。
        </p>
        <div className="auth-story-line" />
        <small>学生在线 · 记录与分享</small>
      </section>
      <section className="auth-form-panel">
        <div className="tabs-line">
          <Link
            className={!registering ? "active" : ""}
            to={`/login?${params}`}
          >
            登录
          </Link>
          <Link
            className={registering ? "active" : ""}
            to={`/register?${params}`}
          >
            注册
          </Link>
        </div>
        <h2>{registering ? "从这里，写下第一笔" : "欢迎回到你的空间"}</h2>
        <p className="muted">
          {registering
            ? "创建账号，开始记录与分享。"
            : "继续那些未完待续的故事。"}
        </p>
        <form onSubmit={handleSubmit(submit)} className="form-stack">
          {registering && (
            <label className="field">
              <span>昵称</span>
              <input
                autoComplete="nickname"
                placeholder="你希望大家如何称呼你"
                maxLength={40}
                {...register("displayName")}
              />
              {errors.displayName && (
                <small className="danger">{errors.displayName.message}</small>
              )}
            </label>
          )}
          <label className="field">
            <span>用户名</span>
            <input
              autoComplete="username"
              placeholder="例如 student_a"
              {...register("username")}
            />
            {errors.username && (
              <small className="danger">{errors.username.message}</small>
            )}
          </label>
          <label className="field">
            <span>密码</span>
            <div className="password-field">
              <input
                type={visible ? "text" : "password"}
                autoComplete={registering ? "new-password" : "current-password"}
                placeholder="至少 8 位字符"
                {...register("password")}
              />
              <button
                type="button"
                aria-label={visible ? "隐藏密码" : "显示密码"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <small className="danger">{errors.password.message}</small>
            )}
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="btn btn-wide" disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : null}
            {registering ? "创建我的空间" : "进入我的空间"}
            <ArrowRight size={16} />
          </button>
        </form>
        <p className="auth-note">
          连接校园教学服务，使用前请确认已接入校园网络。
        </p>
      </section>
    </div>
  );
}
