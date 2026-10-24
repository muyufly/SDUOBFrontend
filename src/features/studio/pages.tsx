import { SelectControl } from "@/components/ui/select-control";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  Folder,
  Heart,
  Image as ImageIcon,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage, queryString } from "@/api/client";
import { useAction, useApi } from "@/api/hooks";
import type {
  Note,
  Page,
  Collection,
  LibraryMedia,
  Notification,
} from "@/api/types";
import {
  Avatar,
  Confirm,
  Empty,
  MediaPicker,
  Modal,
  NoteCard,
  Pager,
  PageTitle,
  QueryState,
  SearchField,
  useFilters,
} from "@/components/common";
import { dateTime, money, statusText } from "@/lib/format";
export function MyArticlesPage() {
  const f = useFilters();
  const query = useApi<Page<Note>>("/me/notes" + f.query);
  const remove = useAction<unknown, string>(
    (id) => api(`/notes/${id}`, { method: "DELETE" }),
    "文章已删除",
  );
  const pin = useAction<Note, Note>((note) =>
    api(`/notes/${note.id}/pin`, {
      method: "POST",
      body: { active: !note.pinnedAt },
    }),
  );
  return (
    <>
      <PageTitle
        title="我的"
        description="写文章、整理草稿，管理你的写作空间。"
        action={
          <Link className="btn" to="/studio/write">
            <Plus size={16} />
            写文章
          </Link>
        }
      />
      <div className="tabs-line">
        {[
          ["", "全部文章"],
          ["PUBLISHED", "已发布"],
          ["DRAFT", "草稿箱"],
        ].map(([v, label]) => (
          <button
            className={(f.params.get("status") || "") === v ? "active" : ""}
            key={v}
            onClick={() => f.set({ status: v })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="list-toolbar">
        <SearchField
          key={f.params.get("q")}
          placeholder="搜索我的文章"
          initial={f.params.get("q") || ""}
          onSearch={(q) => f.set({ q })}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((note) => (
              <article className="management-row" key={note.id}>
                <div className="management-main">
                  <Link to={`/studio/write/${note.id}`}>
                    <h2>{note.title || "未命名草稿"}</h2>
                  </Link>
                  <div className="row-meta">
                    <span className="badge">{statusText[note.status]}</span>
                    {note.hidden && (
                      <span className="badge warning">已隐藏</span>
                    )}
                    {note.pinnedAt && (
                      <span className="gold">
                        <Pin size={12} />
                        已置顶
                      </span>
                    )}
                    <span>更新于 {dateTime(note.updatedAt)}</span>
                  </div>
                </div>
                <div className="row-actions">
                  <Link
                    className="icon-btn"
                    aria-label={`编辑 ${note.title || "未命名草稿"}`}
                    to={`/studio/write/${note.id}`}
                  >
                    <Pencil size={16} />
                  </Link>
                  <Link
                    className="icon-btn"
                    aria-label={`查看 ${note.title || "未命名草稿"}`}
                    to={`/articles/${note.id}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                  {note.status === "PUBLISHED" && !note.hidden && (
                    <button
                      className="icon-btn"
                      title={note.pinnedAt ? "取消置顶" : "置顶到主页"}
                      aria-label={note.pinnedAt ? "取消置顶" : "置顶到主页"}
                      disabled={pin.isPending}
                      onClick={() => pin.mutate(note)}
                    >
                      <Pin size={16} />
                    </button>
                  )}
                  <Confirm
                    title={`删除“${note.title || "未命名草稿"}”？`}
                    description="文章删除后无法恢复，相关评论也将不可访问。"
                    disabled={remove.isPending}
                    onConfirm={() => remove.mutate(note.id)}
                  >
                    <Trash2 size={16} />
                    <span className="sr-only">删除文章</span>
                  </Confirm>
                </div>
              </article>
            ))}
            {!data.total && (
              <Empty
                title="给自己留下一点文字"
                description="可以先存为草稿，等准备好再发布。"
                action={
                  <Link className="btn" to="/studio/write">
                    开始写作 <ArrowUpRight size={16} />
                  </Link>
                }
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </>
  );
}
export function MediaPage() {
  const f = useFilters();
  const query = useApi<Page<LibraryMedia>>(
    "/me/media" + queryString({ page: f.page, pageSize: 18 }),
  );
  const [uploaded, setUploaded] = useState<{ id: string; url: string }[]>([]);
  const remove = useAction<unknown, string>(
    (id) => api(`/media/${id}`, { method: "DELETE" }),
    "素材已删除",
  );
  return (
    <>
      <PageTitle
        title="图片素材"
        description="上传一次，重复使用。留住每一张合适的画面。"
      />
      <div className="panel mb-8">
        <MediaPicker
          value={uploaded}
          onChange={(images) => {
            setUploaded(images);
            void query.refetch();
          }}
          label="上传新素材"
        />
        <p className="small muted mt-3">
          支持 JPEG、PNG、WebP，单张最大 5 MiB。最多 200 张或 100 MiB。所有图片
          URL 均公开。
        </p>
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="media-grid">
                {data.items.map((m) => (
                  <article key={m.id} className="media-item">
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      <img src={m.url} alt="我的图片素材" loading="lazy" />
                    </a>
                    <div>
                      <span>
                        {m.width} × {m.height}
                        <small>
                          {(m.size / 1024).toFixed(0)} KB ·{" "}
                          {m.referenceCount
                            ? `${m.referenceCount} 处引用`
                            : "尚未引用"}
                        </small>
                      </span>
                      <Confirm
                        title="删除这张素材？"
                        description="删除后图片链接将失效，已缓存的副本可能仍会保留。"
                        disabled={!m.canDelete || remove.isPending}
                        onConfirm={() => remove.mutate(m.id)}
                      >
                        <Trash2 size={16} />
                        <span className="sr-only">删除素材</span>
                      </Confirm>
                    </div>
                    {!m.canDelete && (
                      <p className="small muted">
                        先从文章、商品或主页移除引用后，才可删除。
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="素材库还是空的"
                description="上传封面、头像或正文配图，从这里开始。"
                icon={<ImageIcon size={28} />}
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </>
  );
}
export function FavoritesPage() {
  const f = useFilters();
  const collections = useApi<Collection[]>("/me/collections");
  const notes = useApi<Page<Note>>(
    "/me/favorites" +
      queryString({ collectionId: f.params.get("collectionId"), page: f.page }),
  );
  const [editing, setEditing] = useState<Collection | "new" | null>(null);
  const [name, setName] = useState("");
  const current = collections.data?.find(
    (c) => (c.id || "default") === f.params.get("collectionId"),
  );
  const save = useAction(
    () =>
      api(
        editing && editing !== "new"
          ? `/me/collections/${editing.id}`
          : "/me/collections",
        { method: editing === "new" ? "POST" : "PATCH", body: { name } },
      ),
    "收藏夹已保存",
    () => setEditing(null),
  );
  const remove = useAction<unknown, string>(
    (id) => api(`/me/collections/${id}`, { method: "DELETE" }),
    "收藏夹已删除，文章已移回默认收藏夹",
    () => f.set({ collectionId: "default" }),
  );
  return (
    <>
      <PageTitle
        title="我的收藏夹"
        description="把喜欢的文字，收进属于自己的书架。仅自己可见。"
        action={
          <button
            className="btn btn-secondary"
            onClick={() => {
              setName("");
              setEditing("new");
            }}
          >
            <Plus size={16} />
            新建收藏夹
          </button>
        }
      />
      <QueryState query={collections}>
        {(items) => (
          <div className="collection-tabs">
            <button
              className={!f.params.get("collectionId") ? "active" : ""}
              onClick={() => f.set({ collectionId: null })}
            >
              <Folder size={17} />
              全部收藏
            </button>
            {items.map((c) => (
              <button
                key={c.id || "default"}
                className={
                  f.params.get("collectionId") === (c.id || "default")
                    ? "active"
                    : ""
                }
                onClick={() => f.set({ collectionId: c.id || "default" })}
              >
                <Folder size={17} />
                {c.name}
                <span>{c.noteCount}</span>
              </button>
            ))}
          </div>
        )}
      </QueryState>
      {current?.id && (
        <div className="collection-actions">
          <button
            className="text-link"
            onClick={() => {
              setName(current.name);
              setEditing(current);
            }}
          >
            <Pencil size={14} />
            重命名
          </button>
          <Confirm
            title={`删除收藏夹“${current.name}”？`}
            description="收藏的文章不会丢失，会自动移回默认收藏夹。"
            onConfirm={() => remove.mutate(current.id!)}
            disabled={remove.isPending}
          >
            删除收藏夹
          </Confirm>
        </div>
      )}
      <QueryState query={notes}>
        {(data) => (
          <>
            {data.items.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
            {!data.total && (
              <Empty
                title="为喜欢的文字，留个位置"
                description="阅读文章时点一下收藏，就能在这里再次遇见。"
                action={
                  <Link className="btn btn-secondary" to="/latest">
                    去发现文章 <ArrowUpRight size={15} />
                  </Link>
                }
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
      <Modal
        title={editing === "new" ? "新建收藏夹" : "重命名收藏夹"}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="field">
            <span>收藏夹名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              required
              placeholder="例如：想再读一次"
            />
          </label>
          <button className="btn" disabled={save.isPending || !name.trim()}>
            保存
          </button>
        </form>
      </Modal>
    </>
  );
}
export function LikesPage() {
  const f = useFilters();
  const query = useApi<Page<Note>>("/me/likes" + queryString({ page: f.page }));
  return (
    <>
      <PageTitle
        title="点赞历史"
        description="曾经让你心有所动的文字。仅自己可见。"
      />
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
            {!data.total && (
              <Empty
                title="这里，记下每一次共鸣"
                description="你赞过的公开文章会出现在这里。"
                icon={<Heart size={27} />}
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </>
  );
}
const labels: Record<string, string> = {
  LIKE: "赞了你的文章",
  COMMENT: "评论了你的文章",
  REPLY: "回复了你的评论",
  FOLLOW: "关注了你",
  ORDER_PAID: "与你完成了一笔交易",
};
export function NotificationsPage() {
  const client = useQueryClient();
  const f = useFilters();
  const query = useApi<Page<Notification>>("/notifications" + f.query);
  const nav = useNavigate();
  const [opening, setOpening] = useState<string | null>(null);
  const allRead = useAction(
    () => api("/notifications/read-all", { method: "PUT" }),
    "已将全部消息标记为已读",
  );
  const read = useAction<unknown, string>((id) =>
    api(`/notifications/${id}/read`, { method: "PUT" }),
  );
  async function open(item: Notification) {
    if (!item.targetAvailable) return;
    setOpening(item.id);
    try {
      if (!item.readAt) {
        await api(`/notifications/${item.id}/read`, { method: "PUT" });
        void client.invalidateQueries();
      }
      nav(
        item.type === "ORDER_PAID"
          ? `/studio/orders/${item.orderId}`
          : item.type === "FOLLOW"
            ? `/u/${item.targetUsername}`
            : `/articles/${item.noteId}${item.commentId ? `?comment=${item.commentId}#comments` : ""}`,
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setOpening(null);
    }
  }
  return (
    <>
      <PageTitle
        title="消息中心"
        description="每一次回应，都是一次新的连接。"
        action={
          <button
            className="btn btn-secondary"
            disabled={allRead.isPending}
            onClick={() => allRead.mutate()}
          >
            <CheckCheck size={16} />
            全部已读
          </button>
        }
      />
      <div className="list-toolbar">
        <div className="tabs-line compact-tabs">
          {[
            ["", "全部"],
            ["LIKE", "点赞"],
            ["COMMENT", "评论"],
            ["REPLY", "回复"],
            ["FOLLOW", "关注"],
            ["ORDER_PAID", "成交"],
          ].map(([v, label]) => (
            <button
              key={v}
              className={(f.params.get("type") || "") === v ? "active" : ""}
              onClick={() => f.set({ type: v })}
            >
              {label}
            </button>
          ))}
        </div>
        <SelectControl
          aria-label="已读状态"
          value={f.params.get("readStatus") || "all"}
          onValueChange={(readStatus) => f.set({ readStatus })}
          options={[
            { value: "all", label: "全部状态" },
            { value: "unread", label: "未读" },
            { value: "read", label: "已读" },
          ]}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((n) => (
              <article
                key={n.id}
                className={`notification-row ${!n.readAt ? "unread" : ""}`}
              >
                <Avatar user={n.actor} />
                <div>
                  <p>
                    <Link to={`/u/${n.actor.username}`}>
                      {n.actor.displayName}
                    </Link>{" "}
                    {n.type === "ORDER_PAID" && n.order
                      ? n.order.role === "seller"
                        ? "购买了你的商品"
                        : "与你完成了交易"
                      : labels[n.type]}
                  </p>
                  {n.type === "ORDER_PAID" && n.order && (
                    <p>
                      {n.order.productTitle} × {n.order.quantity} ·{" "}
                      {money(n.order.totalCents)}
                    </p>
                  )}
                  <small>
                    {dateTime(n.createdAt)}
                    {!n.targetAvailable && " · 目标内容已不可访问"}
                  </small>
                  <div className="notification-actions">
                    {n.targetAvailable && (
                      <button
                        className="text-link"
                        disabled={opening === n.id}
                        onClick={() => void open(n)}
                      >
                        查看
                        {n.type === "ORDER_PAID"
                          ? "订单"
                          : n.type === "FOLLOW"
                            ? "主页"
                            : "内容"}{" "}
                        <ArrowUpRight size={13} />
                      </button>
                    )}
                    {!n.readAt && (
                      <button
                        className="text-link"
                        disabled={read.isPending}
                        onClick={() => read.mutate(n.id)}
                      >
                        <Check size={13} />
                        标记已读
                      </button>
                    )}
                  </div>
                </div>
                {!n.readAt && <i className="unread-dot" />}
              </article>
            ))}
            {!data.total && (
              <Empty
                title="暂时没有新的消息"
                description="点赞、评论、关注与商品成交消息都会显示在这里。"
                icon={<Bell size={27} />}
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </>
  );
}
