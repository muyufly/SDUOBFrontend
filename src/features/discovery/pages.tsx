import { useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Hash,
  Users,
  BookOpen,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  ArrowLeft,
} from "lucide-react";
import { useApi } from "@/api/hooks";
import { queryString } from "@/api/client";
import { SelectControl } from "@/components/ui/select-control";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Note, Page, Tag, User } from "@/api/types";
import {
  Avatar,
  Empty,
  NoteCard,
  Pager,
  PageTitle,
  QueryState,
  SearchField,
  useFilters,
} from "@/components/common";
import { useAuth } from "@/app/auth";
import { ArticleGalaxy } from "./galaxy";

const articleSortOptions = [
  { value: "latest", label: "最新发布" },
  { value: "oldest", label: "最早发布" },
  { value: "likes", label: "最多点赞" },
  { value: "favorites", label: "最多收藏" },
];

export function HomePage() {
  const location = useLocation();
  const legacy = new URLSearchParams(location.search);
  if (["feed", "tag", "q", "page"].some((key) => legacy.has(key))) {
    const target =
      legacy.get("feed") === "following" ? "/following" : "/latest";
    legacy.delete("feed");
    return (
      <Navigate to={`${target}${legacy.size ? `?${legacy}` : ""}`} replace />
    );
  }
  return (
    <div className="home-container home-landing">
      <section className="home-hero galaxy-hero">
        <div className="hero-copy">
          <h1>
            SDUOnline
            <br />
            <span>BLOG</span>
          </h1>
          <p>学生在线 · 写作与分享</p>
        </div>
        <ArticleGalaxy />
      </section>
    </div>
  );
}

export function FeedPage() {
  const f = useFilters();
  const location = useLocation();
  const { me } = useAuth();
  const following = location.pathname === "/following";
  const feed = following ? "following" : "latest";
  const tag = f.params.get("tag") || "";
  const q = f.params.get("q") || "";
  const username = f.params.get("username") || "";
  const sort = f.params.get("sort") || "latest";
  const [filtersOpen, setFiltersOpen] = useState(false);
  const notes = useApi<Page<Note>>(
    "/notes" +
      queryString({ feed, tag, q, username, sort, page: f.page, pageSize: 10 }),
    !following || !!me,
  );
  return (
    <div className="content-container narrow blog-feed">
      <PageTitle
        title={following ? "我的关注" : "文章"}
        action={
          <div className="article-list-actions">
            <SelectControl
              aria-label="文章排序"
              value={sort}
              onValueChange={(sort) => f.set({ sort })}
              icon={<ArrowDownWideNarrow size={16} />}
              options={articleSortOptions}
            />
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger asChild>
                <button className="btn btn-secondary">
                  <SlidersHorizontal size={16} />
                  筛选
                  {[tag, q, username].filter(Boolean).length > 0 && (
                    <span className="filter-count" aria-hidden="true">
                      {[tag, q, username].filter(Boolean).length}
                    </span>
                  )}
                </button>
              </DialogTrigger>
              <DialogContent className="app-dialog article-filter-dialog">
                <DialogHeader>
                  <DialogTitle>筛选文章</DialogTitle>
                  <DialogDescription>
                    按关键词、话题或作者缩小范围，可组合使用。
                  </DialogDescription>
                </DialogHeader>
                <ArticleFilters
                  key={`${tag}:${q}:${username}`}
                  tag={tag}
                  q={q}
                  username={username}
                  onApply={(values) => {
                    f.set(values);
                    setFiltersOpen(false);
                  }}
                  onCancel={() => setFiltersOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      {(tag || q || username) && (
        <div className="filter-summary">
          <span>
            {tag && `话题：${tag}`} {q && `搜索：${q}`}{" "}
            {username && `作者：@${username}`}
          </span>
          <button onClick={() => f.set({ tag: null, q: null, username: null })}>
            清除筛选 ×
          </button>
        </div>
      )}
      {following && !me ? (
        <Empty
          title="从关注一个人开始"
          description="登录后，在这里读到你关注的作者的新文章。"
          icon={<Users size={30} />}
          action={
            <Link
              className="btn"
              to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
            >
              登录查看关注 <ArrowRight size={15} />
            </Link>
          }
        />
      ) : (
        <QueryState query={notes}>
          {(data) => (
            <>
              {data.items.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
              {!data.total && (
                <Empty
                  title={
                    tag || q || username
                      ? "暂时没有找到这篇文字"
                      : following
                        ? "关注的人还没有发布文章"
                        : "还没有公开文章"
                  }
                  description={
                    tag || q || username
                      ? "换个关键词，或清除筛选再看看。"
                      : following
                        ? "作者发布新文章后，会出现在这里。"
                        : "新的文字发布后，会出现在这里。"
                  }
                />
              )}
              <Pager data={data} />
            </>
          )}
        </QueryState>
      )}
    </div>
  );
}
function ArticleFilters({
  tag,
  q,
  username,
  onApply,
  onCancel,
}: {
  tag: string;
  q: string;
  username: string;
  onApply: (values: Record<string, string | null>) => void;
  onCancel: () => void;
}) {
  const [tagSearch, setTagSearch] = useState(tag);
  const [keyword, setKeyword] = useState(q);
  const [author, setAuthor] = useState(username);
  const tags = useApi<Page<Tag>>(
    "/tags" + queryString({ q: tagSearch, pageSize: 20, sort: "popular" }),
  );
  return (
    <form
      id="article-filters"
      className="article-filters"
      onSubmit={(e) => {
        e.preventDefault();
        onApply({
          q: keyword.trim(),
          tag: tagSearch.trim(),
          username: author.trim(),
        });
      }}
    >
      <label className="field">
        <span>文章关键词</span>
        <input
          name="q"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          maxLength={100}
          placeholder="搜索标题或正文"
        />
      </label>
      <label className="field">
        <span>话题 Tag</span>
        <input
          name="tag"
          value={tagSearch}
          maxLength={20}
          placeholder="搜索或输入 Tag"
          onChange={(e) => setTagSearch(e.target.value)}
        />
        {tags.isError && (
          <small>话题建议暂时不可用，仍可输入完整 Tag 筛选。</small>
        )}
      </label>
      {!!tags.data?.items.length && (
        <div className="tag-suggestions" aria-label="匹配的话题">
          {tags.data.items.slice(0, 6).map((t) => (
            <button
              type="button"
              key={t.tag}
              aria-pressed={tagSearch === t.tag}
              onClick={() => setTagSearch(t.tag)}
            >
              #{t.tag}
              <span>{t.noteCount} 篇</span>
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>作者用户名</span>
        <input
          name="username"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          maxLength={24}
          placeholder="输入完整用户名"
        />
      </label>
      <div className="filter-dialog-actions">
        <button
          className="text-link"
          type="button"
          onClick={() => {
            setKeyword("");
            setTagSearch("");
            setAuthor("");
          }}
        >
          重置
        </button>
        <div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button className="btn" type="submit">
            应用筛选
          </button>
        </div>
      </div>
    </form>
  );
}
export function TopicsPage() {
  const f = useFilters();
  const query = useApi<Page<Tag>>("/tags" + f.query);
  const popular = useApi<Page<Tag>>(
    "/tags/stats?sort=popular&page=1&pageSize=10",
  );
  return (
    <div className="content-container topics-container">
      <h1 className="sr-only">话题</h1>
      <section
        className="popular-topics"
        aria-labelledby="popular-topics-title"
      >
        <div className="popular-topics-heading">
          <h2 id="popular-topics-title">热门话题</h2>
          <span>公开文章数最多的 10 个 Tag</span>
        </div>
        <QueryState query={popular}>
          {(data) =>
            data.items.length ? (
              <ol className="popular-topic-list">
                {data.items.slice(0, 10).map((t, i) => (
                  <li key={t.tag}>
                    <Link to={`/topics/${encodeURIComponent(t.tag)}`}>
                      <span className="topic-rank">{i + 1}</span>
                      <span className="popular-topic-name">#{t.tag}</span>
                      <span className="popular-topic-count">
                        {t.noteCount} 篇
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                公开文章添加 Tag 后，热门话题会出现在这里。
              </p>
            )
          }
        </QueryState>
      </section>
      <h2 className="all-topics-heading">全部话题</h2>
      <div className="list-toolbar">
        <SearchField
          key={f.params.get("q")}
          placeholder="搜索话题"
          initial={f.params.get("q") || ""}
          onSearch={(q) => f.set({ q })}
        />
        <SelectControl
          aria-label="话题排序"
          value={f.params.get("sort") || "popular"}
          onValueChange={(sort) => f.set({ sort })}
          options={[
            { value: "popular", label: "按文章数量" },
            { value: "name", label: "按名称" },
          ]}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.total ? (
              <div className="topic-grid">
                {data.items.map((t) => (
                  <Link to={`/topics/${encodeURIComponent(t.tag)}`} key={t.tag}>
                    <Hash size={21} />
                    <h2>{t.tag}</h2>
                    <span>
                      {t.noteCount} 篇文章 <ArrowUpRight size={16} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="话题还在酝酿"
                description="为你的文章添加标签，让同样感兴趣的人找到你。"
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}
export function TopicArticlesPage() {
  const { tag = "" } = useParams();
  const f = useFilters();
  const requestedSort = f.params.get("sort") || "latest";
  const sort = articleSortOptions.some(({ value }) => value === requestedSort)
    ? requestedSort
    : "latest";
  const notes = useApi<Page<Note>>(
    "/notes" + queryString({ tag, sort, page: f.page, pageSize: 10 }),
  );
  return (
    <div className="content-container topic-articles">
      <Link className="back-link topic-back-link" to="/topics">
        <ArrowLeft size={16} />
        全部话题
      </Link>
      <h1 className="topic-page-title">#{tag}</h1>
      <div className="topic-article-toolbar">
        <span className="muted" role="status">
          {notes.data
            ? `${notes.data.total} 篇文章`
            : notes.isPending
              ? "正在加载文章…"
              : "文章暂时未能加载"}
        </span>
        <SelectControl
          aria-label="话题内文章排序"
          value={sort}
          onValueChange={(sort) => f.set({ sort })}
          icon={<ArrowDownWideNarrow size={16} />}
          options={articleSortOptions}
        />
      </div>
      <QueryState query={notes}>
        {(data) => (
          <>
            <section className="topic-article-list" aria-label="话题内文章">
              {data.items.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
              {!data.total && (
                <Empty
                  title="这个话题还没有公开文章"
                  description="文章添加该 Tag 后，会出现在这里。"
                />
              )}
            </section>
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}
export function SearchPage() {
  const f = useFilters();
  const users = f.params.get("type") === "users";
  const query = useApi<Page<Note | User>>(
    (users ? "/users" : "/notes") +
      queryString({ q: f.params.get("q"), page: f.page, pageSize: 12 }),
  );
  return (
    <div className="content-container narrow">
      <PageTitle
        title="寻找一段文字，或一个人"
        description="让好奇心，带你走远一点。"
      />
      <SearchField
        key={f.params.get("q")}
        placeholder="搜索标题、正文或作者"
        initial={f.params.get("q") || ""}
        onSearch={(q) => f.set({ q })}
      />
      <div className="tabs-line mt-6">
        <button
          className={!users ? "active" : ""}
          onClick={() => f.set({ type: "notes" })}
        >
          <BookOpen size={15} />
          文章
        </button>
        <button
          className={users ? "active" : ""}
          onClick={() => f.set({ type: "users" })}
        >
          <Users size={15} />
          作者
        </button>
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((item) =>
              "contentMarkdown" in item ? (
                <NoteCard key={item.id} note={item} />
              ) : (
                <Link
                  to={`/u/${item.username}`}
                  key={item.id}
                  className="user-row"
                >
                  <Avatar user={item} />
                  <div>
                    <h2>{item.displayName}</h2>
                    <p>
                      @{item.username} · {item.bio || "还没有写下简介"}
                    </p>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              ),
            )}
            {!data.total && (
              <Empty
                title="暂时没有找到结果"
                description="试着换个关键词，再找找看。"
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}
