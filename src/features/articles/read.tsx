import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Link as LinkIcon,
  MessageCircle,
  Moon,
  PenLine,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import { useAuth } from "@/app/auth";
import type { Note, Comment, Page } from "@/api/types";
import {
  Avatar,
  Confirm,
  Empty,
  Pager,
  QueryState,
  Reactions,
  Spinner,
} from "@/components/common";
import { dateTime, money } from "@/lib/format";
import { safeHtml } from "@/lib/markdown";
import { ArticleGallery } from "./gallery";

function CommentForm({
  noteId,
  parentId,
  done,
}: {
  noteId: string;
  parentId?: string;
  done?: () => void;
}) {
  const [body, setBody] = useState("");
  const { me } = useAuth();
  const create = useAction<Comment, void>(
    () =>
      api(`/notes/${noteId}/comments`, {
        method: "POST",
        body: { body, parentId: parentId || null },
      }),
    parentId ? "回复已发送" : "评论已发表",
    () => {
      setBody("");
      done?.();
    },
  );
  if (!me)
    return (
      <div className="comment-login">
        <Link
          to={`/login?next=${encodeURIComponent(`/articles/${noteId}#comments`)}`}
        >
          登录
        </Link>
        后，和作者聊一聊。
      </div>
    );
  return (
    <form
      className="comment-form"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <textarea
        aria-label={parentId ? "回复内容" : "评论内容"}
        value={body}
        maxLength={1000}
        rows={3}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          parentId ? "写下你的回复…" : "一段文字，一次共鸣。说说你的想法…"
        }
      />
      <div>
        <span>{body.length} / 1000</span>
        <button className="btn" disabled={!body.trim() || create.isPending}>
          {create.isPending && <Spinner />}
          {parentId ? "发送回复" : "发表评论"}
        </button>
      </div>
    </form>
  );
}
function CommentRow({
  comment,
  root = false,
  focused,
}: {
  comment: Comment;
  root?: boolean;
  focused?: string;
}) {
  const { me } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [reply, setReply] = useState(false);
  const [page, setPage] = useState(1);
  const replies = useApi<Page<Comment>>(
    `/comments/${comment.id}/replies?page=${page}`,
    root && expanded,
  );
  const remove = useAction(
    () => api(`/comments/${comment.id}`, { method: "DELETE" }),
    "评论已删除",
  );
  return (
    <div
      className={`comment-row ${focused === comment.id ? "comment-highlight" : ""}`}
    >
      <Avatar user={comment.author} size="small" />
      <div className="comment-content">
        <div className="comment-by">
          <Link to={`/u/${comment.author.username}`}>
            {comment.author.displayName}
          </Link>
          <time>{dateTime(comment.createdAt)}</time>
        </div>
        <p>{comment.deleted ? "这条评论已删除" : comment.body}</p>
        <div className="comment-actions">
          {root && !comment.deleted && (
            <button onClick={() => setReply(!reply)}>回复</button>
          )}
          {root && comment.replyCount > 0 && (
            <button onClick={() => setExpanded(!expanded)}>
              {expanded ? "收起回复" : `查看 ${comment.replyCount} 条回复`}
            </button>
          )}
          {me?.id === comment.author.id && !comment.deleted && (
            <Confirm
              title="删除这条评论？"
              description="评论将被移除，已有回复结构会保留。"
              onConfirm={() => remove.mutate()}
              disabled={remove.isPending}
            >
              删除
            </Confirm>
          )}
        </div>
        {reply && (
          <CommentForm
            noteId={comment.noteId}
            parentId={comment.id}
            done={() => {
              setReply(false);
              setExpanded(true);
            }}
          />
        )}
        {expanded && (
          <QueryState query={replies}>
            {(data) => (
              <div className="replies">
                {data.items.map((c) => (
                  <CommentRow key={c.id} comment={c} focused={focused} />
                ))}
                <Pager data={data} onPage={setPage} />
              </div>
            )}
          </QueryState>
        )}
      </div>
    </div>
  );
}
function Comments({ noteId }: { noteId: string }) {
  const [page, setPage] = useState(1);
  const [params] = useSearchParams();
  const focus = params.get("comment");
  const comments = useApi<Page<Comment>>(
    `/notes/${noteId}/comments?page=${page}`,
  );
  const context = useApi<{ comment: Comment; rootComment: Comment }>(
    `/comments/${encodeURIComponent(focus || "")}/context`,
    !!focus,
  );
  useEffect(() => {
    if (focus && (context.data || context.isError))
      document
        .getElementById("focused-comment")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, context.data, context.isError]);
  return (
    <section id="comments" className="comments">
      <h2>
        <MessageCircle size={21} />
        让交流继续 <span>{comments.data?.total ?? ""}</span>
      </h2>
      <CommentForm noteId={noteId} />
      {focus && (
        <div id="focused-comment" className="focused-thread">
          <span className="small muted">消息中的讨论</span>
          <QueryState query={context}>
            {(data) => (
              <>
                <CommentRow comment={data.rootComment} root focused={focus} />
                {data.comment.id !== data.rootComment.id && (
                  <CommentRow comment={data.comment} focused={focus} />
                )}
              </>
            )}
          </QueryState>
        </div>
      )}
      <QueryState query={comments}>
        {(data) => (
          <>
            {data.items.map((c) => (
              <CommentRow key={c.id} comment={c} root />
            ))}
            {!data.total && (
              <Empty
                title="成为第一个回应的人"
                description="好的交流，往往从一句简单的感受开始。"
                icon={<MessageCircle size={25} />}
              />
            )}
            <Pager data={data} onPage={setPage} />
          </>
        )}
      </QueryState>
    </section>
  );
}
export function ArticlePage() {
  const { id = "" } = useParams();
  const note = useApi<Note>(`/notes/${id}`);
  return (
    <QueryState query={note}>
      {(data) => <Article key={data.id} note={data} />}
    </QueryState>
  );
}
function Article({ note }: { note: Note }) {
  const { me } = useAuth();
  const [warm, setWarm] = useState(
    () => localStorage.getItem("sdu.reading") === "warm",
  );
  const [copied, setCopied] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
    [],
  );
  const html = useMemo(() => safeHtml(note.contentHtml), [note.contentHtml]);
  useEffect(() => {
    const headings = Array.from(
      content.current?.querySelectorAll("h1,h2,h3") || [],
    );
    setToc(
      headings.map((h, i) => {
        h.id = `section-${i}`;
        return {
          id: h.id,
          text: h.textContent || "",
          level: Number(h.tagName[1]),
        };
      }),
    );
  }, [html]);
  async function share() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/articles/${note.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("无法复制链接，可以直接复制地址栏。");
    }
  }
  return (
    <div className="article-layout">
      <aside className="article-rail">
        <Link to="/latest" className="back-link">
          <ArrowLeft size={16} />
          返回文章
        </Link>
        <div className="toc">
          <span>这一篇的脉络</span>
          {toc.length ? (
            toc.map((t) => (
              <a
                style={{ paddingLeft: t.level > 2 ? 12 : 0 }}
                key={t.id}
                href={`#${t.id}`}
              >
                {t.text}
              </a>
            ))
          ) : (
            <p>慢慢读，不必赶路。</p>
          )}
        </div>
        <button
          className="reading-switch"
          aria-pressed={warm}
          onClick={() => {
            setWarm(!warm);
            localStorage.setItem("sdu.reading", warm ? "gray" : "warm");
          }}
        >
          {warm ? <Moon size={16} /> : <Sun size={16} />}{" "}
          {warm ? "浅灰阅读" : "暖白阅读"}
        </button>
        <button className="reading-switch" onClick={share}>
          {copied ? <Check size={16} /> : <LinkIcon size={16} />}{" "}
          {copied ? "已复制" : "分享这一篇"}
        </button>
      </aside>
      <article className="article-main">
        <header className="article-header">
          <div className="tags">
            {note.tags.map((t) => (
              <Link key={t} to={`/topics/${encodeURIComponent(t)}`}>
                {t}
              </Link>
            ))}
          </div>
          <h1>{note.title || "未命名草稿"}</h1>
          <div className="article-author">
            <Link to={`/u/${note.author.username}`}>
              <Avatar user={note.author} />
              <span>
                {note.author.displayName}
                <small>创建于 {dateTime(note.createdAt)}</small>
              </span>
            </Link>
            <span>
              约 {Math.max(1, Math.ceil(note.contentMarkdown.length / 400))}{" "}
              分钟阅读
            </span>
          </div>
          {(note.status === "DRAFT" || note.hidden) && (
            <p className="notice">
              {note.hidden
                ? "文章已被隐藏，当前仅本人可见。"
                : "这是草稿，仅本人可见。"}
            </p>
          )}
          {me?.id === note.author.id && (
            <Link className="text-link" to={`/studio/write/${note.id}`}>
              <PenLine size={14} />
              继续编辑
            </Link>
          )}
        </header>
        <ArticleGallery
          title={note.title}
          images={note.images.filter(
            (image, i) => i === 0 || !note.contentMarkdown.includes(image.url),
          )}
        />
        <div className={`reading-surface ${warm ? "warm" : ""}`}>
          <div
            ref={content}
            className="prose article-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        {note.product && (
          <Link to={`/shop/${note.product.id}`} className="linked-product">
            <span>
              文中提到的好物<b>{note.product.title}</b>
            </span>
            <span>
              {money(note.product.priceCents)}
              <ArrowUpRight size={17} />
            </span>
          </Link>
        )}
        {note.status === "PUBLISHED" && !note.hidden && (
          <>
            <div className="article-bottom">
              <Reactions note={note} />
              <span className="small muted">文字因交流而有回响。</span>
            </div>
            <Comments noteId={note.id} />
          </>
        )}
      </article>
    </div>
  );
}
