import { useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Link as LinkIcon,
  Settings,
  UserPlus,
} from "lucide-react";
import { api, queryString } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import type { Profile, Note, Page, Archive, Reaction, User } from "@/api/types";
import { useAuth } from "@/app/auth";
import {
  Avatar,
  Empty,
  Modal,
  NoteCard,
  Pager,
  QueryState,
  useFilters,
} from "@/components/common";
import { safeHtml } from "@/lib/markdown";
export function ProfilePage() {
  const { username = "" } = useParams();
  const profile = useApi<Profile>(`/users/${encodeURIComponent(username)}`);
  return (
    <QueryState query={profile}>
      {(p) => <ProfileView profile={p} />}
    </QueryState>
  );
}

export function ProfileView({
  profile: p,
  editing = false,
}: {
  profile: Profile;
  editing?: boolean;
}) {
  const username = p.username;
  const { me, session } = useAuth();
  const client = useQueryClient();
  const f = useFilters();
  const [tab, setTab] = useState("articles");
  const [people, setPeople] = useState<"followers" | "following" | null>(null);
  const [peoplePage, setPeoplePage] = useState(1);
  const base = `/users/${encodeURIComponent(username)}`;
  const archives = useApi<Archive[]>(`${base}/archives`);
  const notes = useApi<Page<Note>>(
    "/notes" +
      queryString({
        username,
        year: f.params.get("year"),
        month: f.params.get("month"),
        tag: f.params.get("tag"),
        q: f.params.get("q"),
        page: f.page,
        pageSize: 10,
      }),
  );
  const followList = useApi<Page<User>>(
    `${base}/${people}?page=${peoplePage}`,
    !!people,
  );
  const follow = useAction<Reaction, boolean>((active) =>
    api<Reaction>(`${base}/follow`, { method: "POST", body: { active } }).then(
      (result) => {
        client.setQueryData<Profile>(
          ["api", session?.userId ?? "guest", base],
          (current) =>
            current
              ? {
                  ...current,
                  followed: result.active,
                  followerCount: result.count,
                }
              : current,
        );
        return result;
      },
    ),
  );
  return (
    <div
      className="profile-container"
      style={{ "--profile-accent": p.homepage.accentColor } as CSSProperties}
    >
      <div className="profile-cover">
        {p.coverUrl ? (
          <img src={p.coverUrl} alt={`${p.displayName} 的主页封面`} />
        ) : (
          <div className="cover-lines" aria-hidden="true" />
        )}
      </div>
      <div className="profile-intro">
        <Avatar user={p} size="large" />
        <div className="profile-name">
          <h1>{p.displayName}</h1>
          <span>@{p.username}</span>
        </div>
        <div className="profile-actions">
          {editing ? null : me?.username === username ? (
            <Link className="btn btn-secondary" to="/studio/homepage">
              <Settings size={15} />
              编辑主页
            </Link>
          ) : me ? (
            <button
              className={`btn ${p.followed ? "btn-secondary" : ""}`}
              disabled={follow.isPending}
              onClick={() => follow.mutate(!p.followed)}
            >
              {p.followed ? <Check size={16} /> : <UserPlus size={16} />}{" "}
              {p.followed ? "已关注" : "关注作者"}
            </button>
          ) : (
            <Link
              className="btn"
              to={`/login?next=${encodeURIComponent(`/u/${username}`)}`}
            >
              关注作者
            </Link>
          )}
        </div>
      </div>
      <div className="profile-text">
        <h2>{p.homepage.headline || "在这里，记录一路上的想法。"}</h2>
        {p.bio && <p>{p.bio}</p>}
        <div className="profile-counts">
          <span>
            <b>{p.noteCount}</b> 篇文章
          </span>
          <button
            onClick={() => {
              setPeoplePage(1);
              setPeople("followers");
            }}
          >
            <b>{p.followerCount}</b> 位粉丝
          </button>
          <button
            onClick={() => {
              setPeoplePage(1);
              setPeople("following");
            }}
          >
            <b>{p.followingCount}</b> 位关注
          </button>
        </div>
        <div className="profile-links">
          {p.homepage.links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">
              <LinkIcon size={13} />
              {l.label}
              <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
      </div>
      <div className="profile-columns">
        <section>
          <div className="tabs-line">
            <button
              className={tab === "articles" ? "active" : ""}
              onClick={() => setTab("articles")}
            >
              文章
            </button>
            <button
              className={tab === "about" ? "active" : ""}
              onClick={() => setTab("about")}
            >
              关于我
            </button>
            <Link to={`/shop?username=${encodeURIComponent(username)}`}>
              作者商铺 <ArrowUpRight size={13} />
            </Link>
          </div>
          {tab === "about" ? (
            p.homepage.aboutMarkdown ? (
              <div
                className="prose about-content"
                dangerouslySetInnerHTML={{
                  __html: safeHtml(p.homepage.aboutHtml),
                }}
              />
            ) : (
              <Empty
                title="关于我的故事，还在书写"
                description="可以先从文章里认识这位作者。"
              />
            )
          ) : (
            <QueryState query={notes}>
              {(data) => (
                <>
                  {f.params.has("year") && (
                    <div className="filter-summary">
                      {f.params.get("year")} 年 {f.params.get("month")} 月
                      <button
                        onClick={() => f.set({ year: null, month: null })}
                      >
                        查看全部
                      </button>
                    </div>
                  )}
                  <div
                    className={p.homepage.layout === "GRID" ? "notes-grid" : ""}
                  >
                    {data.items.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        grid={p.homepage.layout === "GRID"}
                      />
                    ))}
                  </div>
                  {!data.total && <Empty title="这一页，还在等待第一篇文章" />}
                  <Pager data={data} />
                </>
              )}
            </QueryState>
          )}
        </section>
        <aside className="archive-aside">
          <h2>
            <CalendarDays size={16} />
            沿着时间阅读
          </h2>
          <QueryState query={archives}>
            {(items) =>
              items.length ? (
                items.map((a) => (
                  <button
                    key={`${a.year}-${a.month}`}
                    aria-pressed={
                      f.params.get("year") === String(a.year) &&
                      f.params.get("month") === String(a.month)
                    }
                    onClick={() => {
                      setTab("articles");
                      f.set({ year: a.year, month: a.month });
                    }}
                  >
                    <span>
                      {a.year} 年 {a.month} 月
                    </span>
                    <span>{a.noteCount}</span>
                  </button>
                ))
              ) : (
                <p className="muted">发布文章后，会按创建月份归档。</p>
              )
            }
          </QueryState>
          <p className="small muted mt-5">归档依据文章创建时间（UTC）。</p>
        </aside>
      </div>
      <Modal
        title={people === "followers" ? "关注这位作者的人" : "这位作者关注的人"}
        open={!!people}
        onOpenChange={(open) => {
          if (!open) setPeople(null);
        }}
      >
        <QueryState query={followList}>
          {(data) => (
            <>
              {data.items.map((u) => (
                <Link
                  className="user-row"
                  to={`/u/${u.username}`}
                  key={u.id}
                  onClick={() => setPeople(null)}
                >
                  <Avatar user={u} />
                  <div>
                    <h2>{u.displayName}</h2>
                    <p>@{u.username}</p>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {!data.total && <Empty title="还没有记录" />}
              <Pager data={data} onPage={setPeoplePage} />
            </>
          )}
        </QueryState>
      </Modal>
    </div>
  );
}
