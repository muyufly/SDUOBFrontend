import { SelectControl } from "@/components/ui/select-control";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
  useBeforeUnload,
} from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bold,
  Check,
  Code,
  Eye,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  Quote,
  Save,
  Send,
} from "lucide-react";
import { api, ApiError, errorMessage } from "@/api/client";
import { useApi } from "@/api/hooks";
import type { Note, Page, Product } from "@/api/types";
import { useAuth } from "@/app/auth";
import {
  Confirm,
  MediaPicker,
  Modal,
  Pager,
  QueryState,
  Spinner,
} from "@/components/common";
import { markdown } from "@/lib/markdown";
import {
  editable,
  emptyArticle,
  fingerprint,
  notePayload,
  type EditorValue,
} from "./editor-model";
export function EditorPage() {
  const { id } = useParams();
  const note = useApi<Note>(`/notes/${id}`, !!id);
  return id ? (
    <QueryState query={note}>
      {(data) => <Editor key={data.id} initial={data} />}
    </QueryState>
  ) : (
    <Editor key="new" />
  );
}
function Editor({ initial }: { initial?: Note }) {
  const { me, session } = useAuth();
  const nav = useNavigate();
  const client = useQueryClient();
  const key = `sdu.draft.${session!.userId}.${initial?.id || "new"}`;
  const base = initial ? editable(initial) : emptyArticle;
  const [recovery] = useState<{ value: EditorValue; version?: number } | null>(
    () => {
      try {
        const backup = JSON.parse(sessionStorage.getItem(key) || "null");
        return backup?.value &&
          typeof backup.value.contentMarkdown === "string" &&
          Array.isArray(backup.value.tags) &&
          Array.isArray(backup.value.images)
          ? backup
          : null;
      } catch {
        return null;
      }
    },
  );
  const [value, setValue] = useState<EditorValue>(recovery?.value || base);
  const latest = useRef(value);
  latest.current = value;
  const saved = useRef(fingerprint(base));
  const version = useRef(initial?.version);
  const savingRef = useRef(false);
  const allowNav = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(
    () => sessionStorage.getItem(`${key}.uncertain`) === "true",
  );
  const [conflict, setConflict] = useState<Note | null>(null);
  const [failure, setFailure] = useState("");
  const [ambiguousCreate, setAmbiguousCreate] = useState(
    () => sessionStorage.getItem(`${key}.uncertain`) === "true",
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>();
  const [mobileTab, setMobileTab] = useState("edit");
  const [tags, setTags] = useState(value.tags.join(", "));
  const [productPage, setProductPage] = useState(1);
  const products = useApi<Page<Product>>(
    `/me/products?page=${productPage}&pageSize=50`,
  );
  const dirty = fingerprint(value) !== saved.current;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNav.current &&
      (dirty || saving) &&
      currentLocation.pathname !== nextLocation.pathname,
  );
  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty || saving) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty, saving],
    ),
  );
  useEffect(() => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ value, version: version.current }),
    );
  }, [value, key]);
  useEffect(() => {
    if (
      initial &&
      recovery?.version !== undefined &&
      recovery.version !== initial.version &&
      fingerprint(recovery.value) !== fingerprint(base)
    ) {
      setConflict(initial);
      setBlocked(true);
    }
  }, []);
  function patch(change: Partial<EditorValue>) {
    setValue((v) => ({ ...v, ...change }));
  }
  async function save(status: "DRAFT" | "PUBLISHED", mergedVersion?: number) {
    if (savingRef.current || ambiguousCreate || mediaBusy) return;
    const snapshot = { ...latest.current, status };
    const payload = notePayload(snapshot, mergedVersion ?? version.current);
    if (
      status === "PUBLISHED" &&
      (!snapshot.title.trim() || !snapshot.contentMarkdown.trim())
    ) {
      toast.error("发布前，请填写标题和正文。");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFailure("");
    try {
      const result = await api<Note>(
        initial ? `/notes/${initial.id}` : "/notes",
        { method: initial ? "PUT" : "POST", body: payload },
      );
      version.current = result.version;
      saved.current = fingerprint(editable(result));
      setLastSaved(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setBlocked(false);
      setConflict(null);
      const current = { ...latest.current, status: result.status };
      latest.current = current;
      setValue(current);
      sessionStorage.setItem(
        `sdu.draft.${session!.userId}.${result.id}`,
        JSON.stringify({ value: current, version: result.version }),
      );
      void client.invalidateQueries();
      if (!initial) {
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(`${key}.uncertain`);
        allowNav.current = true;
        nav(`/studio/write/${result.id}`, { replace: true });
      }
      if (status === "PUBLISHED") toast.success("文章已发布");
    } catch (error) {
      setBlocked(true);
      setFailure(errorMessage(error));
      if (
        error instanceof ApiError &&
        error.code === "VERSION_CONFLICT" &&
        initial
      ) {
        try {
          setConflict(await api<Note>(`/notes/${initial.id}`));
        } catch {
          setFailure("保存发生冲突，暂时无法读取服务器版本。你的输入已保留。");
        }
      }
      if (
        !initial &&
        (!(error instanceof ApiError) ||
          error.status === 0 ||
          error.code === "INVALID_RESPONSE" ||
          error.status >= 500)
      ) {
        setAmbiguousCreate(true);
        sessionStorage.setItem(`${key}.uncertain`, "true");
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  useEffect(() => {
    if (value.status !== "DRAFT" || !dirty || saving || blocked || mediaBusy)
      return;
    const timer = setTimeout(() => void save("DRAFT"), 1500);
    return () => clearTimeout(timer);
  }, [value, dirty, saving, blocked, mediaBusy]);
  function insert(before: string, after = "") {
    const field = textarea.current;
    const start = field?.selectionStart ?? value.contentMarkdown.length;
    const end = field?.selectionEnd ?? start;
    patch({
      contentMarkdown:
        value.contentMarkdown.slice(0, start) +
        before +
        value.contentMarkdown.slice(start, end) +
        after +
        value.contentMarkdown.slice(end),
    });
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + before.length, end + before.length);
    });
  }
  function setTagText(text: string) {
    setTags(text);
    const values = [
      ...new Set(
        text
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    patch({ tags: values });
  }
  const invalidTags =
    value.tags.length > 5 || value.tags.some((t) => t.length > 20);
  return (
    <div className="editor-page">
      <header className="editor-header">
        <Link to="/studio" className="back-link">
          <ArrowLeft size={16} />
          我的文章
        </Link>
        <div className="save-indicator" aria-live="polite">
          {saving ? (
            <>
              <Spinner />
              正在保存
            </>
          ) : blocked ? (
            "保存已暂停 · 输入已保留"
          ) : dirty ? (
            "有未保存的修改"
          ) : lastSaved ? (
            <>
              <Check size={14} />
              {lastSaved} 已保存
            </>
          ) : initial ? (
            "已读取保存版本"
          ) : (
            "从一个想法开始"
          )}
        </div>
        <div className="editor-actions">
          <button
            className="btn btn-secondary"
            disabled={
              saving ||
              mediaBusy ||
              invalidTags ||
              ambiguousCreate ||
              !!conflict
            }
            onClick={() => void save("DRAFT")}
          >
            <Save size={15} />
            {value.status === "PUBLISHED" ? "撤回为草稿" : "保存草稿"}
          </button>
          <button
            className="btn"
            disabled={
              saving ||
              mediaBusy ||
              invalidTags ||
              ambiguousCreate ||
              !!conflict
            }
            onClick={() => void save("PUBLISHED")}
          >
            <Send size={15} />
            {value.status === "PUBLISHED" ? "更新文章" : "发布"}
          </button>
        </div>
      </header>
      <h1 className="sr-only">{initial ? "编辑文章" : "写一篇新文章"}</h1>
      {ambiguousCreate && (
        <div className="notice" role="alert">
          <p>
            上次创建结果尚未确认。请先到<Link to="/studio">草稿箱</Link>
            核对，避免重复创建。当前输入已保留。
          </p>
          <Confirm
            title="确认没有创建成功？"
            description="先检查草稿箱。仅在确认没有对应文章时重新创建。"
            onConfirm={() => {
              sessionStorage.removeItem(`${key}.uncertain`);
              setAmbiguousCreate(false);
              setBlocked(false);
              setFailure("");
            }}
          >
            已核对，允许重新创建
          </Confirm>
        </div>
      )}
      {failure && (
        <div className="notice error" role="alert">
          {failure}
          {ambiguousCreate && (
            <p>
              创建结果尚未确认，请先到<Link to="/studio">草稿箱核对</Link>
              ，避免重复创建。当前文字保留在本机。
            </p>
          )}
        </div>
      )}
      {initial?.hidden && (
        <div className="notice">
          这篇文章已被管理员隐藏，保存不会恢复公开状态。
        </div>
      )}
      <input
        className="editor-title-input"
        aria-label="文章标题"
        maxLength={100}
        placeholder="给这一页，起个名字"
        value={value.title}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <div className="editor-tools">
        <div>
          <button aria-label="二级标题" onClick={() => insert("\n## ")}>
            <Heading2 size={18} />
          </button>
          <button aria-label="加粗" onClick={() => insert("**", "**")}>
            <Bold size={17} />
          </button>
          <button aria-label="斜体" onClick={() => insert("*", "*")}>
            <Italic size={17} />
          </button>
          <button aria-label="引用" onClick={() => insert("\n> ")}>
            <Quote size={17} />
          </button>
          <button aria-label="列表" onClick={() => insert("\n- ")}>
            <List size={18} />
          </button>
          <button
            aria-label="代码块"
            onClick={() => insert("\n```\n", "\n```\n")}
          >
            <Code size={18} />
          </button>
          <button
            aria-label="插入链接"
            onClick={() => insert("[", "](https://)")}
          >
            <LinkIcon size={17} />
          </button>
        </div>
        <span>Markdown · {value.contentMarkdown.length} / 12000</span>
        <div className="editor-mobile-tabs">
          <button
            className={mobileTab === "edit" ? "active" : ""}
            onClick={() => setMobileTab("edit")}
          >
            写作
          </button>
          <button
            className={mobileTab === "preview" ? "active" : ""}
            onClick={() => setMobileTab("preview")}
          >
            <Eye size={14} />
            预览
          </button>
        </div>
      </div>
      <div className={`editor-columns show-${mobileTab}`}>
        <textarea
          ref={textarea}
          aria-label="文章正文"
          maxLength={12000}
          value={value.contentMarkdown}
          placeholder="不必等想法完美，先写下来。\n\n支持 Markdown 标题、引用、列表、代码和图片。"
          onChange={(e) => patch({ contentMarkdown: e.target.value })}
        />
        <div className="editor-preview">
          <span className="preview-label">阅读预览</span>
          {value.contentMarkdown ? (
            <div
              className="prose"
              dangerouslySetInnerHTML={{
                __html: markdown(value.contentMarkdown),
              }}
            />
          ) : (
            <div className="preview-empty">你的文字，会在这里慢慢成形。</div>
          )}
        </div>
      </div>
      <div className="editor-options">
        <section>
          <h2>让文字更完整</h2>
          <MediaPicker
            disabled={saving}
            onBusyChange={setMediaBusy}
            value={value.images}
            onChange={(images) => patch({ images })}
            label="封面与配图"
          />
          {!!value.images.length && (
            <div className="insert-images">
              {value.images.map((image, i) => (
                <button
                  className="text-link"
                  key={image.id}
                  onClick={() => insert(`\n![图片 ${i + 1}](${image.url})\n`)}
                >
                  插入第 {i + 1} 张到正文
                </button>
              ))}
            </div>
          )}
          <p className="small muted">
            首张图片作为封面。图片地址公开，草稿中的图片也可被访问。
          </p>
        </section>
        <section>
          <label className="field">
            <span>话题标签</span>
            <input
              value={tags}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="学习笔记, 校园生活"
            />
            <small className={invalidTags ? "danger" : ""}>
              逗号分隔，最多 5 个，每个不超过 20 字。
            </small>
          </label>
          <label className="field">
            <span>关联我的商品</span>
            <SelectControl
              aria-label="关联我的商品"
              value={value.productId || ""}
              onValueChange={(productId) =>
                patch({ productId: productId || null })
              }
              options={[
                { value: "", label: "不关联商品" },
                ...(value.productId &&
                !products.data?.items.some((p) => p.id === value.productId)
                  ? [{ value: value.productId, label: "保留已有商品关联" }]
                  : []),
                ...(products.data?.items.map((p) => ({
                  value: p.id,
                  label: p.title,
                })) ?? []),
              ]}
            />
            <small>读者可在文章末尾查看关联的在售商品。</small>
          </label>
          {products.data && (
            <Pager data={products.data} onPage={setProductPage} />
          )}
          <p className="small muted">
            草稿自动保存；已发布文章需点击“更新文章”。
          </p>
        </section>
      </div>
      <Modal
        title="文章已有更新，请合并后保存"
        description="当前输入完整保留。核对服务器内容后，可关闭窗口继续编辑，再回来确认合并。"
        open={!!conflict}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        {conflict && (
          <>
            <div className="conflict-comparison">
              <section>
                <h3>服务器 · 版本 {conflict.version}</h3>
                <pre>
                  {JSON.stringify(notePayload(editable(conflict)), null, 2)}
                </pre>
              </section>
              <section>
                <h3>当前编辑</h3>
                <pre>{JSON.stringify(notePayload(value), null, 2)}</pre>
              </section>
            </div>
            <div className="button-row">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const incoming = editable(conflict);
                  version.current = conflict.version;
                  saved.current = fingerprint(incoming);
                  setValue(incoming);
                  setTags(incoming.tags.join(", "));
                  setConflict(null);
                  setBlocked(false);
                  setFailure("");
                }}
              >
                采用服务器版本
              </button>
              <button
                className="btn"
                disabled={saving || invalidTags}
                onClick={() => void save(value.status, conflict.version)}
              >
                已核对，保存合并内容
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title="离开当前文章？"
        description="仍有未保存的内容，本机临时备份会保留。下次使用同一账号打开可继续编辑。"
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
      >
        <div className="button-row">
          <button
            className="btn btn-secondary"
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            继续编辑
          </button>
          <button
            className="btn"
            disabled={saving}
            onClick={() => blocker.state === "blocked" && blocker.proceed()}
          >
            {saving ? "等待本次保存结束" : "离开页面"}
          </button>
        </div>
      </Modal>
      {me && initial && (
        <Link className="text-link mt-5" to={`/articles/${initial.id}`}>
          查看保存后的文章
        </Link>
      )}
    </div>
  );
}
