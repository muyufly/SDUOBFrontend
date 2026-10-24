import {
  createBrowserRouter,
  Link,
  Navigate,
  Outlet,
  useRouteError,
} from "react-router-dom";
import { Layout, StudioLayout } from "./layout";
import { RequireAuth } from "./auth";
function NotFound() {
  return (
    <div className="empty-state">
      <h1>这一页，暂时没有找到</h1>
      <p>链接可能已失效，也可以回到首页继续阅读。</p>
      <Link className="btn" to="/">
        返回首页
      </Link>
    </div>
  );
}
function RouteError() {
  const error = useRouteError();
  return (
    <div className="empty-state">
      <h1>页面暂时无法打开</h1>
      <p>{error instanceof Error ? error.message : "请刷新页面再试。"}</p>
      <a className="btn" href="/">
        返回首页
      </a>
    </div>
  );
}
export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: (
      <div className="page-loading">正在打开学生在线…</div>
    ),
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages")).HomePage,
        }),
      },
      {
        path: "latest",
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages")).FeedPage,
        }),
      },
      {
        path: "following",
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages")).FeedPage,
        }),
      },
      {
        path: "topics",
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages")).TopicsPage,
        }),
      },
      {
        path: "topics/:tag",
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages"))
            .TopicArticlesPage,
        }),
      },
      {
        path: "search",
        lazy: async () => ({
          Component: (await import("@/features/discovery/pages")).SearchPage,
        }),
      },
      {
        path: "login",
        lazy: async () => ({
          Component: (await import("@/features/auth/page")).AuthPage,
        }),
      },
      {
        path: "register",
        lazy: async () => ({
          Component: (await import("@/features/auth/page")).AuthPage,
        }),
      },
      {
        path: "articles/:id",
        lazy: async () => ({
          Component: (await import("@/features/articles/read")).ArticlePage,
        }),
      },
      {
        path: "u/:username",
        lazy: async () => ({
          Component: (await import("@/features/profile/page")).ProfilePage,
        }),
      },
      {
        path: "shop",
        lazy: async () => ({
          Component: (await import("@/features/commerce/pages")).ShopPage,
        }),
      },
      {
        path: "shop/:id",
        lazy: async () => ({
          Component: (await import("@/features/commerce/pages")).ProductPage,
        }),
      },
      {
        path: "studio",
        element: (
          <RequireAuth>
            <StudioLayout />
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("@/features/studio/pages"))
                .MyArticlesPage,
            }),
          },
          {
            path: "write",
            lazy: async () => ({
              Component: (await import("@/features/articles/editor"))
                .EditorPage,
            }),
          },
          {
            path: "write/:id",
            lazy: async () => ({
              Component: (await import("@/features/articles/editor"))
                .EditorPage,
            }),
          },
          {
            path: "media",
            lazy: async () => ({
              Component: (await import("@/features/studio/pages")).MediaPage,
            }),
          },
          {
            path: "favorites",
            lazy: async () => ({
              Component: (await import("@/features/studio/pages"))
                .FavoritesPage,
            }),
          },
          {
            path: "likes",
            lazy: async () => ({
              Component: (await import("@/features/studio/pages")).LikesPage,
            }),
          },
          {
            path: "notifications",
            lazy: async () => ({
              Component: (await import("@/features/studio/pages"))
                .NotificationsPage,
            }),
          },
          {
            path: "settings",
            element: <Navigate to="/studio/homepage" replace />,
          },
          {
            path: "homepage",
            lazy: async () => ({
              Component: (await import("@/features/profile/settings"))
                .HomepageSettingsPage,
            }),
          },
          {
            path: "account",
            lazy: async () => ({
              Component: (await import("@/features/profile/settings"))
                .AccountSettingsPage,
            }),
          },
          {
            path: "products",
            lazy: async () => ({
              Component: (await import("@/features/commerce/pages"))
                .MyProductsPage,
            }),
          },
          {
            path: "products/new",
            lazy: async () => ({
              Component: (await import("@/features/commerce/editor"))
                .ProductEditorPage,
            }),
          },
          {
            path: "products/:id",
            lazy: async () => ({
              Component: (await import("@/features/commerce/editor"))
                .ProductEditorPage,
            }),
          },
          {
            path: "wallet",
            lazy: async () => ({
              Component: (await import("@/features/commerce/pages")).WalletPage,
            }),
          },
          {
            path: "cart",
            lazy: async () => ({
              Component: (await import("@/features/commerce/cart")).CartPage,
            }),
          },
          {
            path: "addresses",
            lazy: async () => ({
              Component: (await import("@/features/commerce/addresses"))
                .AddressesPage,
            }),
          },
          {
            path: "orders",
            lazy: async () => ({
              Component: (await import("@/features/commerce/pages")).OrdersPage,
            }),
          },
          {
            path: "orders/:id",
            lazy: async () => ({
              Component: (await import("@/features/commerce/pages")).OrderPage,
            }),
          },
        ],
      },
      {
        path: "admin",
        element: (
          <RequireAuth admin>
            <Outlet />
          </RequireAuth>
        ),
        children: [
          {
            path: ":kind",
            lazy: async () => ({
              Component: (await import("@/features/admin/page")).AdminPage,
            }),
          },
        ],
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
