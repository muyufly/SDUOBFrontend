import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Bell,
  Menu,
  ArrowUpRight,
  LogOut,
  Settings,
  FileText,
  Image,
  Bookmark,
  Heart,
  ShoppingBag,
  ShoppingCart,
  MapPin,
  Wallet,
  ReceiptText,
  ShieldCheck,
  Feather,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "./auth";
import { Avatar, Modal } from "@/components/common";
import { useApi } from "@/api/hooks";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="学生在线博客首页">
      <span className="brand-symbol">
        <BookOpen size={25} strokeWidth={1.4} />
      </span>
      <span>
        学生在线<span className="brand-en">SDU ONLINE / BLOG</span>
      </span>
    </Link>
  );
}
export function Layout() {
  const { me, session, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const unread = useApi<{ count: number }>("/notifications/unread-count", !!me);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const work =
    location.pathname.startsWith("/studio") ||
    location.pathname.startsWith("/admin");
  const links = (
    <>
      <NavLink to="/latest">文章</NavLink>
      <NavLink to="/following">我的关注</NavLink>
      <NavLink to="/topics">话题</NavLink>
      <NavLink to="/shop">商铺</NavLink>
      <NavLink to="/studio">我的</NavLink>
    </>
  );
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        跳至内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="main-nav" aria-label="主导航">
            {links}
          </nav>
          <form
            key={location.pathname + location.search}
            className="header-search-form"
            role="search"
            aria-label="站内搜索"
            onSubmit={(event) => {
              event.preventDefault();
              const q = String(
                new FormData(event.currentTarget).get("q") ?? "",
              ).trim();
              const params = new URLSearchParams();
              if (q) params.set("q", q);
              if (
                location.pathname === "/search" &&
                new URLSearchParams(location.search).get("type") === "users"
              )
                params.set("type", "users");
              nav(`/search${params.size ? `?${params}` : ""}`);
            }}
          >
            <label htmlFor="site-search" className="sr-only">
              搜索文章与作者
            </label>
            <input
              id="site-search"
              type="search"
              name="q"
              placeholder="搜索文章与作者"
              defaultValue={
                location.pathname === "/search"
                  ? (new URLSearchParams(location.search).get("q") ?? "")
                  : ""
              }
            />
            <button type="submit" aria-label="提交站内搜索">
              <Search size={18} />
            </button>
          </form>
          <div className="header-actions">
            {me && (
              <Link
                className="icon-btn notification-link"
                to="/studio/notifications"
                aria-label={`消息${unread.data?.count ? `，${unread.data.count} 条未读` : ""}`}
              >
                <Bell size={19} />
                {!!unread.data?.count && <i />}
              </Link>
            )}
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="account-trigger"
                  aria-label="账号菜单"
                >
                  {me ? <Avatar user={me} size="small" /> : <span>账号</span>}
                  <ChevronDown size={12} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/u/${me?.username}`}>
                      <BookOpen />
                      我的主页
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/studio/homepage">
                      <Settings />
                      主页设置
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/studio/account">
                      <Settings />
                      账号设置
                    </Link>
                  </DropdownMenuItem>
                  {me?.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users">
                        <ShieldCheck />
                        管理员治理
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      void logout().catch((error) =>
                        toast.error(errorMessage(error)),
                      )
                    }
                  >
                    <LogOut />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link className="login-link" to="/login">
                登录 <ArrowUpRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className={work ? "workspace-root" : "public-main"}>
        <Outlet />
      </main>
      <ScrollRestoration />
      {!work && (
        <footer className="site-footer">
          <div>
            <span className="footer-brand">
              <Feather size={17} />
              写下此刻，留给以后。
            </span>
            <span>学生在线 · 博客与分享</span>
          </div>
          <div>
            <Link to="/latest">文章</Link>
            <small>© {new Date().getFullYear()} SDU Online</small>
          </div>
        </footer>
      )}
    </div>
  );
}
const groups = [
  {
    label: "创作",
    links: [
      ["/studio", "我的文章", FileText],
      ["/studio/media", "图片素材", Image],
    ],
  },
  {
    label: "阅读与交流",
    links: [
      ["/studio/favorites", "收藏夹", Bookmark],
      ["/studio/likes", "点赞历史", Heart],
      ["/studio/notifications", "消息中心", Bell],
    ],
  },
  {
    label: "我的商铺",
    links: [
      ["/studio/products", "商品管理", ShoppingBag],
      ["/studio/cart", "购物车", ShoppingCart],
      ["/studio/orders", "买卖订单", ReceiptText],
      ["/studio/addresses", "地址簿", MapPin],
      ["/studio/wallet", "模拟钱包", Wallet],
    ],
  },
  {
    label: "个人",
    links: [
      ["/studio/homepage", "主页设置", BookOpen],
      ["/studio/account", "账号设置", Settings],
    ],
  },
] as const;
export function StudioLayout() {
  const { me } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const profileLink = me && (
    <Link
      className="sidebar-profile"
      to={`/u/${encodeURIComponent(me.username)}`}
      onClick={() => setOpen(false)}
    >
      <Avatar user={me} />
      <span>
        <strong className="sidebar-profile-name">{me.displayName}</strong>
        <small>查看公开主页</small>
      </span>
      <ArrowUpRight size={16} />
    </Link>
  );
  const nav = (
    <>
      {groups.map((g) => (
        <section key={g.label}>
          <h2>{g.label}</h2>
          {g.links.map(([to, text, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/studio"}
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              {text}
            </NavLink>
          ))}
        </section>
      ))}
      {me?.role === "ADMIN" && (
        <NavLink to="/admin/users">
          <ShieldCheck size={17} />
          管理员治理
        </NavLink>
      )}
    </>
  );
  return (
    <div
      className={`studio-layout ${location.pathname === "/studio/homepage" ? "homepage-studio" : ""}`}
    >
      <aside className="studio-sidebar">
        {profileLink}
        <div className="sidebar-heading">
          我的空间<span>写作、阅读与日常，都在这里。</span>
        </div>
        {nav}
      </aside>
      <div className="studio-content">
        <button
          className="btn btn-secondary studio-mobile-nav"
          onClick={() => setOpen(true)}
        >
          <Menu size={16} />
          我的空间导航
        </button>
        <Modal title="我的空间" open={open} onOpenChange={setOpen}>
          <nav className="studio-mobile-links">
            {profileLink}
            {nav}
          </nav>
        </Modal>
        <Outlet />
      </div>
    </div>
  );
}
