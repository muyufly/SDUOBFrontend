import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Heart,
  Loader2,
  MessageCircle,
  Search,
  Bookmark,
  Pin,
  X,
  ImagePlus,
} from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, ApiError, errorMessage, queryString } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import type {
  Note,
  Page,
  User,
  LibraryMedia,
  Media,
  Reaction,
  Collection,
} from "@/api/types";
import { useAuth } from "@/app/auth";
import { date, excerpt } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Spinner() {
  return <Loader2 className="spin" size={17} aria-label="正在处理" />;
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Avatar({
  user,
  size = "normal",
}: {
  user: Pick<User, "displayName" | "avatarUrl">;
  size?: "small" | "normal" | "large";
}) {
  return (
    <span className={`avatar avatar-${size}`}>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" />
      ) : (
        user.displayName.slice(0, 1)
      )}
    </span>
  );
}
export function Empty({
  title = "这里还没有内容",
  description = "新的故事，正在等待被写下。",
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        {icon || <BookOpen size={28} strokeWidth={1.2} />}
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="loading-stack" role="status" aria-label="正在加载">
        <div className="skeleton h-6 w-2/5" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    );
  if (query.isError)
    return (
      <div className="error-state" role="alert">
        <h2>
          {query.error instanceof ApiError &&
          [403, 404].includes(query.error.status)
            ? "内容暂不可访问"
            : "暂时没有连接上"}
        </h2>
        <p>{errorMessage(query.error)}</p>
        {query.error instanceof ApiError && query.error.requestId && (
          <details>
            <summary>排查信息</summary>
            <code>{query.error.requestId}</code>
          </details>
        )}
        <button
          className="btn btn-secondary"
          onClick={() => void query.refetch()}
        >
          重新加载
        </button>
      </div>
    );
  return <>{children(query.data)}</>;
}
export function Pager({
  data,
  onPage,
}: {
  data: Pick<Page<unknown>, "total" | "page" | "pageSize">;
  onPage?: (page: number) => void;
}) {
  const [params, setParams] = useSearchParams();
  const pages = Math.ceil(data.total / data.pageSize);
  if (pages <= 1 && data.page === 1) return null;
  const go = (page: number) => {
    if (onPage) onPage(page);
    else {
      const next = new URLSearchParams(params);
      next.set("page", String(page));
      setParams(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <nav className="pagination" aria-label="分页">
      <span>
        共 {data.total} 条 · 第 {data.page} / {Math.max(pages, 1)} 页
      </span>
      <div>
        <button
          className="icon-btn"
          aria-label="上一页"
          disabled={data.page <= 1}
          onClick={() => go(data.page - 1)}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="icon-btn"
          aria-label="下一页"
          disabled={data.page >= pages}
          onClick={() => go(data.page + 1)}
        >
          <ArrowRight size={17} />
        </button>
      </div>
    </nav>
  );
}
export function SearchField({
  placeholder = "搜索",
  onSearch,
  initial = "",
}: {
  placeholder?: string;
  initial?: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="search-field"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" aria-label="提交搜索">
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function useFilters(defaults: Record<string, string | number> = {}) {
  const [params, setParams] = useSearchParams();
  const set = (values: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    if (!("page" in values)) next.delete("page");
    setParams(next);
  };
  const page = Math.max(1, Number(params.get("page")) || 1);
  return {
    params,
    set,
    page,
    query: queryString({ ...defaults, ...Object.fromEntries(params), page }),
  };
}
export function Confirm({
  children,
  title,
  description,
  onConfirm,
  disabled,
}: {
  children: ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button disabled={disabled} className="btn btn-ghost danger">
          {children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>保留</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
  trigger,
}: {
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  trigger?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || "完成后保存，或关闭返回。"}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
const compactNoteCount = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumSignificantDigits: 2,
});
const noteCountLabel = (count: number) =>
  count < 10000 ? String(count) : compactNoteCount.format(count);

export function NoteCard({
  note,
  grid = false,
}: {
  note: Note;
  grid?: boolean;
}) {
  return (
    <article className={cn("note-card", grid && "note-card-grid")}>
      <div className="note-card-body">
        <Link to={`/u/${note.author.username}`} className="author-line">
          <Avatar user={note.author} size="small" />
          <span>{note.author.displayName}</span>
          <span className="muted">{date(note.createdAt)}</span>
          {note.pinnedAt && (
            <span className="pin">
              <Pin size={12} />
              置顶
            </span>
          )}
        </Link>
        <Link className="note-title" to={`/articles/${note.id}`}>
          <h2>{note.title || "未命名草稿"}</h2>
        </Link>
        <p className="note-excerpt">
          {excerpt(note.contentMarkdown) || "从一个想法开始。"}
        </p>
        <div className="note-meta">
          <div className="tags">
            {note.tags.slice(0, 3).map((tag) => (
              <Link key={tag} to={`/topics/${encodeURIComponent(tag)}`}>
                {tag}
              </Link>
            ))}
          </div>
          <div className="note-stats">
            <span
              aria-label={`${note.likeCount} 次点赞`}
              title={`${note.likeCount} 次点赞`}
            >
              <Heart size={14} aria-hidden="true" />
              <span>{noteCountLabel(note.likeCount)}</span>
            </span>
            <span
              aria-label={`${note.commentCount} 条评论`}
              title={`${note.commentCount} 条评论`}
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span>{noteCountLabel(note.commentCount)}</span>
            </span>
          </div>
        </div>
      </div>
      <Link
        className={cn("note-cover", !note.images[0] && "note-cover-text")}
        to={`/articles/${note.id}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        {note.images[0] ? (
          <img src={note.images[0].url} loading="lazy" alt="" />
        ) : (
          <span>{note.title.trim() || "未命名草稿"}</span>
        )}
      </Link>
    </article>
  );
}
export function Reactions({ note: incoming }: { note: Note }) {
  const [note, setNote] = useState(incoming);
  useEffect(() => setNote(incoming), [incoming]);
  const { me } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [choosing, setChoosing] = useState(false);
  const collections = useApi<Collection[]>("/me/collections", !!me && choosing);
  const react = useAction<
    Reaction,
    { kind: "like" | "favorite"; active: boolean }
  >((v) =>
    api(`/notes/${note.id}/${v.kind}`, {
      method: "POST",
      body: { active: v.active },
    }).then((result: unknown) => {
      const reaction = result as Reaction;
      setNote((current) => ({
        ...current,
        ...(v.kind === "like"
          ? { liked: reaction.active, likeCount: reaction.count }
          : { favorited: reaction.active, favoriteCount: reaction.count }),
      }));
      return reaction;
    }),
  );
  const move = useAction<unknown, string | null>(
    (id) =>
      api(`/me/favorites/${note.id}/collection`, {
        method: "PUT",
        body: { collectionId: id },
      }),
    "收藏已整理",
    () => setChoosing(false),
  );
  function act(kind: "like" | "favorite") {
    if (!me) {
      nav(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    react.mutate({
      kind,
      active: !(kind === "like" ? note.liked : note.favorited),
    });
  }
  return (
    <div className="reactions">
      <button
        className={cn("btn btn-secondary", note.liked && "is-active")}
        disabled={react.isPending}
        onClick={() => act("like")}
      >
        <Heart size={17} fill={note.liked ? "currentColor" : "none"} />
        点赞 {note.likeCount}
      </button>
      <button
        className={cn("btn btn-secondary", note.favorited && "is-active")}
        disabled={react.isPending}
        onClick={() => act("favorite")}
      >
        <Bookmark size={17} fill={note.favorited ? "currentColor" : "none"} />
        {note.favorited ? "已收藏" : "收藏"} {note.favoriteCount}
      </button>
      {note.favorited && (
        <button className="btn btn-ghost" onClick={() => setChoosing(true)}>
          整理到…
        </button>
      )}
      <Modal title="选择收藏夹" open={choosing} onOpenChange={setChoosing}>
        <QueryState query={collections}>
          {(items) => (
            <div className="option-list">
              {items.map((c) => (
                <button
                  key={c.id || "default"}
                  disabled={move.isPending}
                  onClick={() => move.mutate(c.id)}
                >
                  {c.name}
                  {note.favoriteCollectionId === c.id && <Check size={16} />}
                </button>
              ))}
            </div>
          )}
        </QueryState>
      </Modal>
    </div>
  );
}
export function MediaPicker({
  value,
  onChange,
  max = 9,
  label = "图片",
  disabled = false,
  onBusyChange,
}: {
  value: { id: string; url: string }[];
  onChange: (images: { id: string; url: string }[]) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const library = useApi<Page<LibraryMedia>>(
    `/me/media?page=${page}&pageSize=12`,
    open,
  );
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    if (files.length + value.length > max) {
      toast.error(`最多选择 ${max} 张图片`);
      input.value = "";
      return;
    }
    setUploading(true);
    onBusyChange?.(true);
    const added: Media[] = [];
    try {
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error("请选择不超过 5 MiB 的 JPEG、PNG 或 WebP 图片");
        const form = new FormData();
        form.append("file", file);
        added.push(await api<Media>("/media", { method: "POST", body: form }));
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      if (added.length) {
        onChange([...value, ...added]);
        void library.refetch();
      }
      setUploading(false);
      onBusyChange?.(false);
      input.value = "";
    }
  }
  return (
    <div className="media-picker">
      <div className="field-caption">
        <span>{label}</span>
        <span>
          {value.length} / {max}
        </span>
      </div>
      <div className="chosen-images">
        {value.map((image, i) => (
          <div key={image.id}>
            <img src={image.url} alt={`已选图片 ${i + 1}`} />
            <button
              type="button"
              aria-label={`移除图片 ${i + 1}`}
              onClick={() => onChange(value.filter((x) => x.id !== image.id))}
            >
              <X size={14} />
            </button>
            {i > 0 && (
              <button
                type="button"
                className="move-image"
                aria-label={`将图片 ${i + 1} 前移`}
                onClick={() => {
                  const next = [...value];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                <ArrowLeft size={13} />
              </button>
            )}
          </div>
        ))}
        <label className="upload-tile">
          {uploading ? <Spinner /> : <ImagePlus size={20} />}
          <span>{uploading ? "上传中" : "上传图片"}</span>
          <input
            aria-label={`上传${label}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={max > 1}
            disabled={disabled || uploading || value.length >= max}
            onChange={upload}
          />
        </label>
      </div>
      <button type="button" className="text-link" onClick={() => setOpen(true)}>
        从我的素材库选择 <ArrowUpRight size={14} />
      </button>
      <Modal
        title="我的素材库"
        description="复用已上传的图片，无需重复上传。"
        open={open}
        onOpenChange={setOpen}
      >
        <QueryState query={library}>
          {(data) => (
            <>
              <div className="media-grid compact">
                {data.items.map((item) => (
                  <button
                    type="button"
                    className={cn(
                      "media-option",
                      value.some((x) => x.id === item.id) && "selected",
                    )}
                    key={item.id}
                    onClick={() => {
                      if (value.some((x) => x.id === item.id)) return;
                      if (value.length >= max) {
                        toast.error(`最多选择 ${max} 张`);
                        return;
                      }
                      onChange([...value, { id: item.id, url: item.url }]);
                      setOpen(false);
                    }}
                  >
                    <img src={item.url} alt="素材预览" />
                  </button>
                ))}
              </div>
              {data.total === 0 && (
                <Empty
                  title="素材库还是空的"
                  description="先上传一张图片，之后就能在这里重复使用。"
                />
              )}
              <Pager data={data} onPage={setPage} />
            </>
          )}
        </QueryState>
      </Modal>
    </div>
  );
}
export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function SimpleForm({
  onSubmit,
  children,
  className,
}: {
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
    </form>
  );
}
