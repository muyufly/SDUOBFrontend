import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, saveSession, errorMessage } from "@/api/client";
import { useAction, useApi } from "@/api/hooks";
import type { Me, Profile } from "@/api/types";
import { useAuth } from "@/app/auth";
import {
  MediaPicker,
  PageTitle,
  QueryState,
  Spinner,
} from "@/components/common";
import { markdown } from "@/lib/markdown";
import { ProfileView } from "./page";
import { SelectControl } from "@/components/ui/select-control";

export function HomepageSettingsPage() {
  const { me } = useAuth();
  const initial = me!;
  const profile = useApi<Profile>(
    `/users/${encodeURIComponent(initial.username)}`,
  );
  const [displayName, setName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [homepage, setHomepage] = useState(initial.homepage);
  const [avatar, setAvatar] = useState(
    initial.avatarId && initial.avatarUrl
      ? [{ id: initial.avatarId, url: initial.avatarUrl }]
      : [],
  );
  const [cover, setCover] = useState(
    initial.coverId && initial.coverUrl
      ? [{ id: initial.coverId, url: initial.coverUrl }]
      : [],
  );
  const [open, setOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fields = {
    displayName,
    bio,
    avatarId: avatar[0]?.id || null,
    coverId: cover[0]?.id || null,
    homepage: {
      headline: homepage.headline,
      aboutMarkdown: homepage.aboutMarkdown,
      accentColor: homepage.accentColor,
      layout: homepage.layout,
      links: homepage.links,
    },
  };
  const [saved, setSaved] = useState(JSON.stringify(fields));
  const dirty = JSON.stringify(fields) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const prevent = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  const save = useAction<Me, typeof fields>(
    (body) => api("/me", { method: "PATCH", body }),
    "主页设置已保存",
    (result) => {
      setName(result.displayName);
      setBio(result.bio);
      setHomepage(result.homepage);
      setSaved(
        JSON.stringify({
          displayName: result.displayName,
          bio: result.bio,
          avatarId: result.avatarId,
          coverId: result.coverId,
          homepage: {
            headline: result.homepage.headline,
            aboutMarkdown: result.homepage.aboutMarkdown,
            accentColor: result.homepage.accentColor,
            layout: result.homepage.layout,
            links: result.homepage.links,
          },
        }),
      );
    },
  );
  const update = (patch: Partial<typeof homepage>) =>
    setHomepage((h) => ({ ...h, ...patch }));
  return (
    <div className="homepage-editor">
      <div className="homepage-editor-heading">
        <div>
          <h2>主页设置</h2>
          <p role="status">
            {dirty ? "有未保存的修改" : "修改内容，实时查看主页效果"}
          </p>
        </div>
        <div className="homepage-editor-actions">
          <Link
            className="btn btn-secondary"
            to={`/u/${initial.username}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            预览公开主页 <ArrowUpRight size={15} />
          </Link>
          <button
            className="btn btn-secondary homepage-tools-toggle"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="homepage-tools"
          >
            <SlidersHorizontal size={16} />
            修改主页
          </button>
        </div>
      </div>
      <div className="homepage-editor-grid">
        <section className="homepage-canvas" aria-label="主页实时预览">
          <QueryState query={profile}>
            {(p) => (
              <ProfileView
                editing
                profile={{
                  ...p,
                  displayName,
                  bio,
                  avatarUrl: avatar[0]?.url || null,
                  coverUrl: cover[0]?.url || null,
                  homepage: {
                    ...homepage,
                    aboutHtml: markdown(homepage.aboutMarkdown),
                  },
                }}
              />
            )}
          </QueryState>
        </section>
        <aside
          id="homepage-tools"
          className={`homepage-tools ${open ? "is-open" : ""}`}
          aria-label="主页修改工具"
        >
          <div className="homepage-tools-heading">
            <h2>修改主页</h2>
            <button
              className="icon-btn homepage-tools-close"
              aria-label="收起修改工具"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <form
            onInvalidCapture={(event) => {
              const details = (event.target as HTMLElement).closest("details");
              if (details) details.open = true;
            }}
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(fields);
            }}
          >
            <fieldset disabled={save.isPending}>
              <details open>
                <summary>个人资料</summary>
                <div className="form-stack">
                  <label className="field">
                    <span>昵称</span>
                    <input
                      value={displayName}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={40}
                      required
                      pattern=".*\S.*"
                    />
                  </label>
                  <label className="field">
                    <span>个人简介</span>
                    <textarea
                      rows={3}
                      value={bio}
                      maxLength={500}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="简单介绍你正在探索的事情"
                    />
                  </label>
                  <MediaPicker
                    value={avatar}
                    onChange={setAvatar}
                    onBusyChange={setUploadingAvatar}
                    max={1}
                    label="头像"
                  />
                </div>
              </details>
              <details open>
                <summary>封面与外观</summary>
                <div className="form-stack">
                  <MediaPicker
                    value={cover}
                    onChange={setCover}
                    onBusyChange={setUploadingCover}
                    max={1}
                    label="主页封面"
                  />
                  <label className="field">
                    <span>标题短句</span>
                    <input
                      value={homepage.headline}
                      maxLength={80}
                      onChange={(e) => update({ headline: e.target.value })}
                      placeholder="在课本之外，继续探索"
                    />
                  </label>
                  <label className="field">
                    <span>主页强调色</span>
                    <div className="color-field">
                      <input
                        type="color"
                        value={homepage.accentColor}
                        onChange={(e) =>
                          update({ accentColor: e.target.value })
                        }
                      />
                      <span>{homepage.accentColor}</span>
                    </div>
                  </label>
                  <label className="field">
                    <span>文章排列</span>
                    <SelectControl
                      aria-label="文章排列"
                      value={homepage.layout}
                      onValueChange={(layout) =>
                        update({ layout: layout as "LIST" | "GRID" })
                      }
                      options={[
                        { value: "LIST", label: "舒展列表" },
                        { value: "GRID", label: "图文网格" },
                      ]}
                    />
                  </label>
                </div>
              </details>
              <details open>
                <summary>关于我</summary>
                <div className="form-stack">
                  <label className="field">
                    <span>关于我 · Markdown</span>
                    <textarea
                      rows={6}
                      value={homepage.aboutMarkdown}
                      maxLength={5000}
                      onChange={(e) =>
                        update({ aboutMarkdown: e.target.value })
                      }
                      placeholder="写下兴趣、经历或正在进行的项目"
                    />
                    <small>在左侧切换「关于我」，即可查看效果。</small>
                  </label>
                </div>
              </details>
              <details>
                <summary>外部链接 · {homepage.links.length} / 5</summary>
                <div className="form-stack">
                  {homepage.links.map((link, i) => (
                    <div className="homepage-link-edit" key={i}>
                      <div>
                        <label className="field">
                          <span>链接 {i + 1} 名称</span>
                          <input
                            value={link.label}
                            maxLength={30}
                            required
                            onChange={(e) =>
                              update({
                                links: homepage.links.map((l, n) =>
                                  n === i ? { ...l, label: e.target.value } : l,
                                ),
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`移除链接 ${i + 1}`}
                          onClick={() =>
                            update({
                              links: homepage.links.filter((_, n) => n !== i),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <label className="field">
                        <span>链接 {i + 1} 地址</span>
                        <input
                          type="url"
                          value={link.url}
                          maxLength={500}
                          placeholder="https://"
                          pattern="https?://.*"
                          required
                          onChange={(e) =>
                            update({
                              links: homepage.links.map((l, n) =>
                                n === i ? { ...l, url: e.target.value } : l,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={homepage.links.length >= 5}
                    onClick={() =>
                      update({
                        links: [...homepage.links, { label: "", url: "" }],
                      })
                    }
                  >
                    <Plus size={16} />
                    添加链接
                  </button>
                </div>
              </details>
            </fieldset>
            <div className="homepage-tools-save">
              <button
                className="btn"
                disabled={
                  !dirty || save.isPending || uploadingAvatar || uploadingCover
                }
              >
                {save.isPending ? <Spinner /> : <Save size={16} />}保存主页设置
              </button>
              <small>保存后更新公开主页</small>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

export function AccountSettingsPage() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [password, setPassword] = useState({
    oldPassword: "",
    newPassword: "",
  });
  const [changing, setChanging] = useState(false);
  async function changePassword() {
    setChanging(true);
    try {
      await api("/auth/password", { method: "PUT", body: password });
      saveSession(null);
      window.dispatchEvent(new Event("sdu:session-expired"));
      toast.success("密码已修改，请重新登录");
      nav("/login", { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setChanging(false);
    }
  }
  return (
    <>
      <PageTitle title="账号设置" description="管理登录账号与密码。" />
      <section className="settings-section">
        <div>
          <h2>登录账号</h2>
          <p>用户名是你的主页地址，创建后不可修改。</p>
        </div>
        <div className="panel form-stack">
          <label className="field">
            <span>用户名</span>
            <input value={me!.username} disabled />
          </label>
          <Link className="text-link" to="/studio/homepage">
            修改主页资料 <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
      <section className="settings-section password-section">
        <div>
          <h2>账号密码</h2>
          <p>修改后，所有设备的登录会话会失效，需要重新登录。</p>
        </div>
        <form
          className="panel form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void changePassword();
          }}
        >
          <label className="field">
            <span>当前密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password.oldPassword}
              minLength={8}
              maxLength={128}
              required
              onChange={(e) =>
                setPassword((p) => ({ ...p, oldPassword: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password.newPassword}
              minLength={8}
              maxLength={128}
              required
              onChange={(e) =>
                setPassword((p) => ({ ...p, newPassword: e.target.value }))
              }
            />
          </label>
          <button className="btn btn-secondary" disabled={changing}>
            {changing && <Spinner />}修改密码
          </button>
        </form>
      </section>
    </>
  );
}
