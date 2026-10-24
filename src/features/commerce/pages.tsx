import { SelectControl } from "@/components/ui/select-control";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Coins,
  CreditCard,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Wallet as WalletIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError, errorMessage, queryString } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import type {
  Product,
  Page,
  Order,
  Ledger,
  Address,
  CartItem,
} from "@/api/types";
import { useAuth } from "@/app/auth";
import {
  Avatar,
  Confirm,
  Empty,
  Pager,
  PageTitle,
  QueryState,
  SearchField,
  Spinner,
  useFilters,
} from "@/components/common";
import { dateTime, money, parseCents, statusText } from "@/lib/format";
import { operationKey, pendingOperation } from "@/lib/idempotency";
import { AddressSelection, definiteFailure } from "./shared";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <Link className="product-image" to={`/shop/${product.id}`}>
        {product.images[0] ? (
          <img src={product.images[0].url} alt={product.title} loading="lazy" />
        ) : (
          <div className="no-product-image">
            <Package size={40} strokeWidth={1} />
            <span>暂无商品图片</span>
          </div>
        )}
      </Link>
      <div className="product-card-details">
        <Link to={`/shop/${product.id}`}>
          <h2>{product.title}</h2>
        </Link>
        <p>{product.description}</p>
        <div>
          <strong>{money(product.priceCents)}</strong>
          <span>库存 {product.stock}</span>
        </div>
        <Link className="author-line" to={`/u/${product.seller.username}`}>
          <Avatar user={product.seller} size="small" />
          {product.seller.displayName}
          <ArrowUpRight size={12} />
        </Link>
      </div>
    </article>
  );
}
export function ShopPage() {
  const f = useFilters();
  const query = useApi<Page<Product>>(
    "/products" +
      queryString({
        q: f.params.get("q"),
        username: f.params.get("username"),
        page: f.page,
        pageSize: 12,
      }),
  );
  return (
    <div className="content-container shop-discovery">
      {f.params.get("username") ? (
        <PageTitle title={`@${f.params.get("username")} 的商铺`} />
      ) : (
        <h1 className="sr-only">商铺</h1>
      )}
      <div className="list-toolbar">
        <SearchField
          key={f.params.get("q")}
          initial={f.params.get("q") || ""}
          placeholder="搜索商品"
          onSearch={(q) => f.set({ q })}
        />
        {f.params.has("username") && (
          <button
            className="text-link"
            onClick={() => f.set({ username: null })}
          >
            查看全部商铺
          </button>
        )}
        <div className="shop-toolbar-actions">
          <span className="badge">模拟交易 · 无真实资金</span>
          <Link className="text-link" to="/studio/cart">
            <ShoppingCart size={16} />
            购物车
          </Link>
          <Link className="text-link" to="/studio/addresses">
            地址簿
          </Link>
          <Link className="btn btn-secondary" to="/studio/products">
            我的商铺 <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="product-grid">
                {data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <Empty
                title="好物正在路上"
                description="先上架一件商品，为你的创作多开一扇小窗。"
                icon={<ShoppingBag size={29} />}
                action={
                  <Link className="btn btn-secondary" to="/studio/products/new">
                    发布我的商品 <Plus size={16} />
                  </Link>
                }
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </div>
  );
}
export function ProductPage() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  const query = useApi<Product>(`/products/${id}`);
  return (
    <QueryState query={query}>
      {(product) => (
        <ProductDetail
          key={`${product.id}.${session?.userId}`}
          product={product}
        />
      )}
    </QueryState>
  );
}
function ProductDetail({ product }: { product: Product }) {
  const { me, session } = useAuth();
  const nav = useNavigate();
  const operation = `order.${product.id}`;
  const [pending, setPending] = useState(() =>
    session ? pendingOperation(session.userId, operation) : null,
  );
  const [quantity, setQuantity] = useState(() => {
    try {
      return pending ? (JSON.parse(pending.fingerprint).quantity as number) : 1;
    } catch {
      return 1;
    }
  });
  const [imageIndex, setImageIndex] = useState(0);
  const [addressId, setAddressId] = useState(() => {
    try {
      return pending
        ? (JSON.parse(pending.fingerprint).addressId as string) || ""
        : "";
    } catch {
      return "";
    }
  });
  const addresses = useApi<{ items: Address[] }>(
    "/me/addresses",
    !!me && me.id !== product.seller.id,
  );
  const addToCart = useAction(async () => {
    const cart = await api<{ items: CartItem[] }>("/cart");
    const existing = cart.items.find((item) => item.productId === product.id);
    const nextQuantity = (existing?.quantity || 0) + quantity;
    if (nextQuantity > Math.min(99, product.stock))
      throw new Error(
        `购物车已有 ${existing?.quantity || 0} 件，合计不能超过库存与单次限购数量。`,
      );
    return api("/cart/items", {
      method: "PUT",
      body: { productId: product.id, quantity: nextQuantity },
    });
  }, "已加入购物车");
  const order = useAction<Order>(
    () => {
      const body = pending
        ? (JSON.parse(pending.fingerprint) as {
            productId: string;
            quantity: number;
            addressId?: string;
          })
        : { productId: product.id, quantity, addressId };
      const handle = operationKey(me!.id, operation, body);
      setPending(pendingOperation(me!.id, operation));
      return api<Order>("/orders", {
        method: "POST",
        key: handle.key,
        body,
      })
        .then((result) => {
          handle.clear();
          setPending(null);
          return result;
        })
        .catch((error) => {
          if (definiteFailure(error)) {
            handle.clear();
            setPending(null);
          }
          throw error;
        });
    },
    "订单已创建",
    (result) => nav(`/studio/orders/${result.id}`),
  );
  const unavailable =
    product.status !== "ON_SALE" || product.hidden || product.stock === 0;
  const quantityValid =
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= Math.min(99, product.stock);
  const addressValid = addresses.data?.items.some((a) => a.id === addressId);
  const login = () =>
    nav(`/login?next=${encodeURIComponent(`/shop/${product.id}`)}`);
  return (
    <div className="content-container">
      <Link className="back-link" to="/shop">
        <ArrowLeft size={16} />
        返回商铺
      </Link>
      <div className="product-detail">
        <div className="product-gallery">
          <div className="product-main-image">
            {product.images[imageIndex] ? (
              <img src={product.images[imageIndex].url} alt={product.title} />
            ) : (
              <div className="no-product-image">
                <Package size={60} strokeWidth={1} />
                <span>暂无商品图片</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="product-thumbs">
              {product.images.map((image, i) => (
                <button
                  key={image.id}
                  aria-label={`查看第 ${i + 1} 张商品图`}
                  aria-pressed={imageIndex === i}
                  onClick={() => setImageIndex(i)}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <section className="product-info">
          <span className="badge">创作者商铺 · 模拟交易</span>
          <h1>{product.title}</h1>
          <p className="product-description">{product.description}</p>
          <strong className="product-price">{money(product.priceCents)}</strong>
          <Link className="seller" to={`/u/${product.seller.username}`}>
            <Avatar user={product.seller} />
            <span>
              {product.seller.displayName}
              <small>前往作者主页</small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
          <div className="purchase-panel">
            <div className="trade-seller-contact">
              <span>卖家联系方式</span>
              <p>{product.sellerContact || "卖家暂未公开联系方式"}</p>
            </div>
            <div className="quantity-row">
              <label htmlFor="quantity">购买数量</label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={Math.min(99, product.stock) || 1}
                value={quantity}
                disabled={!!pending || order.isPending || addToCart.isPending}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <span>库存 {product.stock}</span>
            </div>
            {pending && (
              <p className="notice">
                上一笔下单尚未确认，重试将沿用原操作，不会重复创建。
              </p>
            )}
            {me && me.id !== product.seller.id && (
              <QueryState query={addresses}>
                {({ items }) => (
                  <AddressSelection
                    addresses={items}
                    value={addressId}
                    onChange={setAddressId}
                    disabled={!!pending || order.isPending}
                  />
                )}
              </QueryState>
            )}
            <div className="purchase-total">
              <span>合计</span>
              <strong>
                {money(
                  product.priceCents *
                    (Number.isFinite(quantity) ? quantity : 0),
                )}
              </strong>
            </div>
            {me?.id === product.seller.id ? (
              <Link
                className="btn btn-wide"
                to={`/studio/products/${product.id}`}
              >
                管理这件商品 <ArrowRight size={16} />
              </Link>
            ) : (
              <div className="trade-purchase-actions">
                <button
                  className="btn btn-secondary"
                  disabled={
                    !!pending ||
                    order.isPending ||
                    addToCart.isPending ||
                    unavailable ||
                    !quantityValid
                  }
                  onClick={() => (me ? addToCart.mutate() : login())}
                >
                  {addToCart.isPending ? (
                    <Spinner />
                  ) : (
                    <ShoppingCart size={17} />
                  )}
                  加入购物车
                </button>
                <button
                  className="btn"
                  disabled={
                    order.isPending ||
                    addToCart.isPending ||
                    (!pending &&
                      (unavailable ||
                        !quantityValid ||
                        (!!me && !addressValid)))
                  }
                  onClick={() => (me ? order.mutate() : login())}
                >
                  {order.isPending ? <Spinner /> : <ShoppingBag size={17} />}
                  {pending
                    ? "确认原订单"
                    : unavailable
                      ? "暂不可购买"
                      : "立即购买"}
                </button>
              </div>
            )}
            <Link className="text-link trade-cart-entry" to="/studio/cart">
              查看购物车，批量结算
              <ArrowUpRight size={14} />
            </Link>
            <p className="small muted">
              下单后可在订单页用模拟余额支付。付款时核对库存，无物流与退款服务。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
export function MyProductsPage() {
  const f = useFilters();
  const query = useApi<Page<Product>>("/me/products" + f.query);
  return (
    <>
      <PageTitle
        title="商品管理"
        description="从草稿到上架，打理你的个人商铺。"
        action={
          <Link to="/studio/products/new" className="btn">
            <Plus size={16} />
            发布商品
          </Link>
        }
      />
      <div className="tabs-line">
        {[
          ["", "全部"],
          ["DRAFT", "草稿"],
          ["ON_SALE", "在售"],
          ["OFF_SALE", "已下架"],
        ].map(([v, name]) => (
          <button
            key={v}
            className={(f.params.get("status") || "") === v ? "active" : ""}
            onClick={() => f.set({ status: v })}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="list-toolbar">
        <SearchField
          key={f.params.get("q")}
          initial={f.params.get("q") || ""}
          placeholder="搜索我的商品"
          onSearch={(q) => f.set({ q })}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((p) => (
              <article className="management-row" key={p.id}>
                {p.images[0] && (
                  <img className="row-thumbnail" src={p.images[0].url} alt="" />
                )}
                <div className="management-main">
                  <h2>
                    <Link to={`/studio/products/${p.id}`}>{p.title}</Link>
                  </h2>
                  <div className="row-meta">
                    <span className="badge">{statusText[p.status]}</span>
                    {p.hidden && <span className="badge warning">已隐藏</span>}
                    <span>库存 {p.stock}</span>
                    <span>{money(p.priceCents)}</span>
                  </div>
                </div>
                <Link
                  className="btn btn-secondary"
                  to={`/studio/products/${p.id}`}
                >
                  编辑 <ArrowRight size={15} />
                </Link>
              </article>
            ))}
            {!data.total && (
              <Empty
                title="开张，从一件好物开始"
                action={
                  <Link className="btn btn-secondary" to="/studio/products/new">
                    创建商品
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
export function WalletPage() {
  const { me } = useAuth();
  const client = useQueryClient();
  const wallet = useApi<{ balanceCents: number }>("/wallet");
  const f = useFilters();
  const ledger = useApi<Page<Ledger>>(
    "/wallet/ledger" + queryString({ page: f.page }),
  );
  const [pending, setPending] = useState(() =>
    pendingOperation(me!.id, "recharge"),
  );
  const [amountInput, setAmountInput] = useState(() => {
    try {
      return pending
        ? (JSON.parse(pending.fingerprint).amountCents / 100).toFixed(2)
        : "10.00";
    } catch {
      return "10.00";
    }
  });
  const amount = parseCents(amountInput);
  const validAmount = amount !== null && amount >= 1 && amount <= 999900;
  const amountError = amountInput !== "" && !validAmount;
  const recharge = useAction<unknown>(
    () => {
      if (!validAmount)
        throw new Error("请输入 0.01 至 9999 元，最多两位小数。");
      const handle = operationKey(me!.id, "recharge", { amountCents: amount });
      setPending(pendingOperation(me!.id, "recharge"));
      return api("/wallet/recharges", {
        method: "POST",
        body: { amountCents: amount },
        key: handle.key,
      })
        .then((data) => {
          handle.clear();
          setPending(null);
          return data;
        })
        .catch((error) => {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status !== 408 &&
            error.code !== "INVALID_RESPONSE" &&
            error.status < 500
          ) {
            handle.clear();
            setPending(null);
          }
          throw error;
        });
    },
    "模拟余额已到账",
    () => {
      void client.invalidateQueries();
    },
  );
  const adjustAmount = (stepCents: number) => {
    if (!validAmount || pending || recharge.isPending) return;
    const nextAmount = Math.min(999900, Math.max(1, amount + stepCents));
    setAmountInput((nextAmount / 100).toFixed(2));
  };
  return (
    <>
      <PageTitle
        title="模拟钱包"
        description="练习完整的交易流程。这里的余额不代表真实资金。"
      />
      <QueryState query={wallet}>
        {(data) => (
          <section className="wallet-overview">
            <div className="wallet-balance">
              <span>
                <WalletIcon size={17} />
                可用模拟余额
              </span>
              <strong>{money(data.balanceCents)}</strong>
              <small>每一笔收支，都有记录。</small>
            </div>
            <form
              className="wallet-recharge"
              onSubmit={(event) => {
                event.preventDefault();
                if (validAmount && !recharge.isPending) recharge.mutate();
              }}
            >
              <h2>补充一点模拟余额</h2>
              <div className="recharge-amount">
                <label htmlFor="recharge-amount">充值金额（元）</label>
                <div className="recharge-stepper">
                  <button
                    type="button"
                    aria-label="减少充值金额 0.01 元"
                    aria-controls="recharge-amount"
                    disabled={
                      !validAmount ||
                      amount <= 1 ||
                      !!pending ||
                      recharge.isPending
                    }
                    onClick={() => adjustAmount(-1)}
                  >
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    id="recharge-amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max="9999"
                    step="0.01"
                    required
                    value={amountInput}
                    disabled={!!pending || recharge.isPending}
                    aria-invalid={amountError || undefined}
                    aria-describedby={`recharge-amount-help${amountError ? " recharge-amount-error" : ""}`}
                    onChange={(event) => setAmountInput(event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label="增加充值金额 0.01 元"
                    aria-controls="recharge-amount"
                    disabled={
                      !validAmount ||
                      amount >= 999900 ||
                      !!pending ||
                      recharge.isPending
                    }
                    onClick={() => adjustAmount(1)}
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <small id="recharge-amount-help">
                  支持 0.01 至 9999 元，最多两位小数。
                </small>
                {amountError && (
                  <p
                    id="recharge-amount-error"
                    className="small notice error"
                    role="alert"
                  >
                    请输入 0.01 至 9999 元，最多两位小数。
                  </p>
                )}
              </div>
              {pending && (
                <p className="small notice">
                  上次充值 {money(amount!)} 结果待确认，重试将沿用同一操作。
                </p>
              )}
              <button
                className="btn btn-secondary"
                type="submit"
                disabled={!validAmount || recharge.isPending}
              >
                {recharge.isPending ? <Spinner /> : <Plus size={16} />}{" "}
                {pending ? "确认原充值" : "模拟充值"}
              </button>
            </form>
          </section>
        )}
      </QueryState>
      <h2 className="section-title">钱包流水</h2>
      <QueryState query={ledger}>
        {(data) => (
          <>
            {data.items.map((item) => (
              <div className="ledger-row" key={item.id}>
                <div>
                  <span>{statusText[item.type]}</span>
                  <small>{dateTime(item.createdAt)}</small>
                </div>
                <div>
                  <strong>
                    {item.amountCents > 0 ? "+" : ""}
                    {money(item.amountCents)}
                  </strong>
                  <small>余额 {money(item.balanceAfterCents)}</small>
                </div>
                {item.orderId && (
                  <Link
                    className="icon-btn"
                    aria-label="查看相关订单"
                    to={`/studio/orders/${item.orderId}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                )}
              </div>
            ))}
            {!data.total && (
              <Empty
                title="第一笔流水，还没开始"
                description="充值、购买或售出后，会在这里留下记录。"
                icon={<Coins size={27} />}
              />
            )}
            <Pager data={data} />
          </>
        )}
      </QueryState>
    </>
  );
}
export function OrdersPage() {
  const f = useFilters({ role: "buyer" });
  const query = useApi<Page<Order>>("/orders" + f.query);
  return (
    <>
      <PageTitle
        title="买卖订单"
        description="每一次购买与售出，都清楚地记录在这里。"
      />
      <div className="list-toolbar">
        <div className="tabs-line compact-tabs">
          <button
            className={f.params.get("role") !== "seller" ? "active" : ""}
            onClick={() => f.set({ role: "buyer" })}
          >
            我买到的
          </button>
          <button
            className={f.params.get("role") === "seller" ? "active" : ""}
            onClick={() => f.set({ role: "seller" })}
          >
            我卖出的
          </button>
        </div>
        <SelectControl
          aria-label="订单状态"
          value={f.params.get("status") || ""}
          onValueChange={(status) => f.set({ status })}
          options={[
            { value: "", label: "全部状态" },
            { value: "PENDING", label: "待支付" },
            { value: "PAID", label: "已支付" },
            { value: "CANCELLED", label: "已取消" },
          ]}
        />
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            {data.items.map((o) => (
              <Link
                key={o.id}
                className="order-row"
                to={`/studio/orders/${o.id}`}
              >
                <div>
                  <h2>{o.productTitle}</h2>
                  <p>
                    {dateTime(o.createdAt)} · {o.quantity} 件
                  </p>
                </div>
                <span
                  className={`badge ${o.status === "PENDING" ? "warning" : ""}`}
                >
                  {statusText[o.status]}
                </span>
                <strong>{money(o.totalCents)}</strong>
                <ArrowUpRight size={17} />
              </Link>
            ))}
            {!data.total && (
              <Empty
                title="暂时还没有订单"
                description="去商铺逛逛，看看创作者们分享的好物。"
                action={
                  <Link className="btn btn-secondary" to="/shop">
                    前往商铺
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
export function OrderPage() {
  const { id = "" } = useParams();
  const { me } = useAuth();
  const query = useApi<Order>(`/orders/${id}`);
  const client = useQueryClient();
  const [paying, setPaying] = useState(false);
  const cancel = useAction(
    () => api<Order>(`/orders/${id}/cancel`, { method: "POST" }),
    "订单已取消",
  );
  async function pay() {
    setPaying(true);
    try {
      await api(`/orders/${id}/pay`, { method: "POST" });
      toast.success("模拟支付成功");
    } catch (error) {
      try {
        const actual = await api<Order>(`/orders/${id}`);
        if (actual.status === "PAID") toast.success("已确认支付成功");
        else toast.error(errorMessage(error));
      } catch {
        toast.error("支付结果暂未确认，请刷新订单确认状态后再操作。");
      }
    } finally {
      await client.invalidateQueries();
      setPaying(false);
    }
  }
  return (
    <>
      <Link className="back-link" to="/studio/orders">
        <ArrowLeft size={15} />
        返回订单
      </Link>
      <QueryState query={query}>
        {(o) => (
          <>
            <PageTitle
              title="订单详情"
              description={`创建于 ${dateTime(o.createdAt)}`}
              action={
                <span
                  className={`badge ${o.status === "PENDING" ? "warning" : ""}`}
                >
                  {statusText[o.status]}
                </span>
              }
            />
            <section className="panel order-detail">
              <Link className="order-product-name" to={`/shop/${o.productId}`}>
                <Package size={25} />
                {o.productTitle}
                <ArrowUpRight size={17} />
              </Link>
              <dl>
                <div>
                  <dt>订单编号</dt>
                  <dd className="break-all">{o.id}</dd>
                </div>
                <div>
                  <dt>单价</dt>
                  <dd>{money(o.unitPriceCents)}</dd>
                </div>
                <div>
                  <dt>数量</dt>
                  <dd>{o.quantity} 件</dd>
                </div>
                <div>
                  <dt>订单金额</dt>
                  <dd className="order-total">{money(o.totalCents)}</dd>
                </div>
                <div>
                  <dt>收货人</dt>
                  <dd>{o.recipientName || "历史订单未记录"}</dd>
                </div>
                <div>
                  <dt>联系电话</dt>
                  <dd>{o.recipientPhone || "历史订单未记录"}</dd>
                </div>
                <div>
                  <dt>收货地址</dt>
                  <dd>{o.recipientAddress || "历史订单未记录"}</dd>
                </div>
                <div>
                  <dt>卖家联系方式</dt>
                  <dd>{o.sellerContact || "卖家未提供"}</dd>
                </div>
                {o.paidAt && (
                  <div>
                    <dt>支付时间</dt>
                    <dd>{dateTime(o.paidAt)}</dd>
                  </div>
                )}
                {o.cancelledAt && (
                  <div>
                    <dt>取消时间</dt>
                    <dd>{dateTime(o.cancelledAt)}</dd>
                  </div>
                )}
              </dl>
              <p className="small muted">
                以上收货信息与联系方式为下单时的快照，之后修改地址簿或商品不会改变此订单。
              </p>
              {o.status === "PENDING" && o.buyerId === me?.id && (
                <div className="button-row">
                  <button
                    className="btn"
                    disabled={paying || cancel.isPending}
                    onClick={() => void pay()}
                  >
                    {paying ? <Spinner /> : <CreditCard size={17} />}
                    使用模拟余额支付
                  </button>
                  <Confirm
                    title="取消这笔订单？"
                    description="待支付订单可以取消，不会扣除模拟余额。"
                    disabled={paying || cancel.isPending}
                    onConfirm={() => cancel.mutate()}
                  >
                    取消订单
                  </Confirm>
                  <Link className="text-link" to="/studio/wallet">
                    前往钱包充值 <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
              {o.status === "PENDING" && o.sellerId === me?.id && (
                <p className="notice">等待买家支付。库存将在付款成功后扣减。</p>
              )}
              <p className="small muted mt-5">
                这是教学模拟订单，无真实付款、物流或退款。
              </p>
            </section>
          </>
        )}
      </QueryState>
    </>
  );
}
