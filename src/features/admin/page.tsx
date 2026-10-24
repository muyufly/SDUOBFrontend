import { Link, NavLink, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import type { Page, AdminUser, AdminNote, AdminProduct } from "@/api/types";
import {
  Confirm,
  Empty,
  Pager,
  PageTitle,
  QueryState,
  SearchField,
  useFilters,
} from "@/components/common";
import { dateTime, excerpt } from "@/lib/format";
import { useAuth } from "@/app/auth";
import { SelectControl } from "@/components/ui/select-control";
type Item = AdminUser | AdminNote | AdminProduct;
export function AdminPage() {
  const { kind = "users" } = useParams();
  const safeKind = ["users", "notes", "products"].includes(kind)
    ? kind
    : "users";
  const users = safeKind === "users";
  const f = useFilters();
  const { me } = useAuth();
  const query = useApi<Page<Item>>(`/admin/${safeKind}` + f.query);
  const update = useAction<unknown, Item>(
    (item) =>
      api(`/admin/${safeKind}/${item.id}`, {
        method: "PATCH",
        body:
          "username" in item
            ? { disabled: !item.disabled }
            : { hidden: !item.hidden },
      }),
    "状态已更新",
  );
  return (
    <div className="admin-container">
      <Link className="back-link" to="/studio">
        <ArrowLeft size={16} />
        回到创作工作台
      </Link>
      <PageTitle
        title="管理员治理"
        description="维护账号与公开内容的秩序。草稿和用户私有资源不在管理范围。"
        action={
          <span className="badge">
            <ShieldCheck size={14} />
            管理员
          </span>
        }
      />
      <nav className="tabs-line">
        <NavLink to="/admin/users">账号</NavLink>
        <NavLink to="/admin/notes">文章</NavLink>
        <NavLink to="/admin/products">商品</NavLink>
      </nav>
      <div className="list-toolbar">
        <SearchField
          key={`${safeKind}-${f.params.get("q")}`}
          initial={f.params.get("q") || ""}
          placeholder={
            users ? "搜索昵称、用户名或完整 ID" : "搜索标题、作者或完整 ID"
          }
          onSearch={(q) => f.set({ q })}
        />
        <SelectControl
          key={safeKind}
          aria-label="管理状态筛选"
          value={f.params.get("state") || "all"}
          onValueChange={(state) => f.set({ state })}
          options={[
            { value: "all", label: "全部状态" },
            {
              value: users ? "enabled" : "unhidden",
              label: users ? "正常账号" : "未隐藏",
            },
            {
              value: users ? "disabled" : "hidden",
              label: users ? "已禁用" : "已隐藏",
            },
          ]}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            <div className="small muted mb-3">共 {data.total} 条记录</div>
            {data.items.map((item) => {
              const isUser = "username" in item;
              const active = isUser ? item.disabled : item.hidden;
              const title = isUser ? item.displayName : item.title;
              const owner = isUser
                ? item
                : "author" in item
                  ? item.author
                  : item.seller;
              const forbidden =
                isUser && (item.role === "ADMIN" || item.id === me?.id);
              return (
                <article className="admin-row" key={item.id}>
                  <div>
                    <h2>
                      {title}{" "}
                      <span className={`badge ${active ? "warning" : ""}`}>
                        {isUser
                          ? item.disabled
                            ? "已禁用"
                            : "正常"
                          : item.hidden
                            ? "已隐藏"
                            : "未隐藏"}
                      </span>
                      {isUser && item.role === "ADMIN" && (
                        <span className="badge">管理员</span>
                      )}
                    </h2>
                    <p>
                      @{owner.username}
                      {!isUser && owner.disabled ? " · 作者账号已禁用" : ""}
                    </p>
                    <small className="break-all">ID: {item.id}</small>
                    {!isUser && (
                      <p className="admin-excerpt">
                        {excerpt(
                          "contentMarkdown" in item
                            ? item.contentMarkdown
                            : item.description,
                          180,
                        )}
                      </p>
                    )}
                    <small>
                      {dateTime(isUser ? item.createdAt : item.updatedAt)}
                    </small>
                  </div>
                  <div>
                    {forbidden ? (
                      <span className="small muted">管理员账号受保护</span>
                    ) : (
                      <Confirm
                        title={`${isUser ? (active ? "恢复账号" : "禁用账号") : active ? "解除隐藏" : "隐藏内容"}“${title}”？`}
                        description={
                          isUser
                            ? active
                              ? "恢复后用户需要重新登录。"
                              : "这会撤销该账号的全部会话，公开内容也将不可见。"
                            : active
                              ? "仅解除隐藏，不改变发布或上架状态，不恢复置顶。作者被禁用时仍不可公开。"
                              : "内容将不再公开，作者本人仍可查看。文章置顶也会取消。"
                        }
                        onConfirm={() => update.mutate(item)}
                        disabled={update.isPending}
                      >
                        {isUser
                          ? active
                            ? "恢复账号"
                            : "禁用账号"
                          : active
                            ? "解除隐藏"
                            : "隐藏内容"}
                      </Confirm>
                    )}
                  </div>
                </article>
              );
            })}
            {!data.total && (
              <Empty
                title="没有符合条件的记录"
                description="试着调整搜索词或状态筛选。"
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}
