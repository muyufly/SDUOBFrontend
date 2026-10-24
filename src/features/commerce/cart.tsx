import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CreditCard,
  Package,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  Address,
  CartItem,
  CartCheckoutInput,
  CartCheckoutResult,
} from "@/api/types";
import { api, ApiError, errorMessage } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import { useAuth } from "@/app/auth";
import {
  Empty,
  Modal,
  PageTitle,
  QueryState,
  Spinner,
} from "@/components/common";
import { money } from "@/lib/format";
import { operationKey, pendingOperation } from "@/lib/idempotency";
import { AddressPreview, AddressSelection, definiteFailure } from "./shared";

type CheckoutBody = CartCheckoutInput;
type CheckoutResult = CartCheckoutResult;
const operation = "cart.checkout";

function restoreCheckout(userId: string): CheckoutBody | null {
  const pending = pendingOperation(userId, operation);
  if (!pending) return null;
  try {
    const value = JSON.parse(pending.fingerprint) as CheckoutBody;
    return value &&
      typeof value.addressId === "string" &&
      Array.isArray(value.items) &&
      value.items.length > 0 &&
      value.items.every(
        (i) =>
          typeof i.cartItemId === "string" &&
          Number.isInteger(i.quantity) &&
          Number.isInteger(i.unitPriceCents),
      )
      ? value
      : null;
  } catch {
    return null;
  }
}

export function CartPage() {
  const { me } = useAuth();
  return <Cart key={me!.id} userId={me!.id} />;
}

function Cart({ userId }: { userId: string }) {
  const cart = useApi<{ items: CartItem[] }>("/cart");
  const addresses = useApi<{ items: Address[] }>("/me/addresses");
  const wallet = useApi<{ balanceCents: number }>("/wallet");
  const client = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [addressId, setAddressId] = useState("");
  const [pending, setPending] = useState(() => restoreCheckout(userId));
  const [confirmation, setConfirmation] = useState<CheckoutBody | null>(null);
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);
  const [paying, setPaying] = useState(false);
  const [conflict, setConflict] = useState(false);
  const change = useAction(
    async (body: { productId: string; quantity: number }) => {
      const result = await api("/cart/items", { method: "PUT", body });
      setDrafts((old) => {
        const next = { ...old };
        rows
          .filter((row) => row.productId === body.productId)
          .forEach((row) => {
            delete next[row.id];
          });
        return next;
      });
      return result;
    },
    "购物车数量已更新",
  );
  const remove = useAction(async (id: string) => {
    const result = await api(`/cart/items/${id}`, { method: "DELETE" });
    setDrafts((old) => {
      const next = { ...old };
      delete next[id];
      return next;
    });
    setSelected((old) => {
      const next = new Set(old);
      next.delete(id);
      return next;
    });
    return result;
  }, "已移出购物车");
  const locked = !!pending || paying || change.isPending || remove.isPending;
  const rows = cart.data?.items || [];
  const chosen = rows.filter((r) => selected.has(r.id));
  const quantityOf = (row: CartItem) => Number(drafts[row.id] ?? row.quantity);
  const dirty = rows.some(
    (r) => drafts[r.id] !== undefined && String(r.quantity) !== drafts[r.id],
  );
  const valid =
    chosen.length > 0 &&
    chosen.length <= 50 &&
    chosen.every(
      (r) =>
        r.available &&
        r.product &&
        Number.isInteger(quantityOf(r)) &&
        quantityOf(r) >= 1 &&
        quantityOf(r) <= Math.min(99, r.product.stock),
    );
  const total = chosen.reduce(
    (sum, r) =>
      sum +
      (r.product?.priceCents || 0) *
        (Number.isFinite(quantityOf(r)) ? quantityOf(r) : 0),
    0,
  );
  const selectedAddress = addresses.data?.items.find((a) => a.id === addressId);
  const pendingTotal =
    pending?.items.reduce((sum, r) => sum + r.unitPriceCents * r.quantity, 0) ??
    0;
  const pendingQuantity =
    pending?.items.reduce((sum, r) => sum + r.quantity, 0) ?? 0;
  const availableRows = rows.filter((r) => r.available && r.product);
  const allSelected =
    availableRows.length > 0 && availableRows.every((r) => selected.has(r.id));
  const checkoutDisabled =
    locked ||
    !valid ||
    !selectedAddress ||
    dirty ||
    wallet.isPending ||
    wallet.isError ||
    !!(wallet.data && total > wallet.data.balanceCents);
  const chosenQuantity = chosen.reduce(
    (sum, row) =>
      sum + (Number.isFinite(quantityOf(row)) ? quantityOf(row) : 0),
    0,
  );
  const showMobileCheckout =
    rows.length > 0 && !confirmation && !pending && !paying && !cart.isError;
  function review() {
    if (!valid || !selectedAddress || dirty || locked) return;
    setConfirmation({
      items: chosen.map((r) => ({
        cartItemId: r.id,
        quantity: quantityOf(r),
        unitPriceCents: r.product!.priceCents,
      })),
      addressId,
    });
  }
  async function checkout(body: CheckoutBody) {
    if (paying) return;
    setPaying(true);
    try {
      const handle = operationKey(userId, operation, body);
      setPending(body);
      try {
        const result = await api<CheckoutResult>("/cart/checkout", {
          method: "POST",
          body,
          key: handle.key,
        });
        handle.clear();
        setPending(null);
        setConfirmation(null);
        setSelected(new Set());
        setDrafts({});
        setReceipt(result);
        setConflict(false);
        toast.success(`模拟支付成功，已生成 ${result.orders.length} 笔订单`);
      } catch (error) {
        setConfirmation(null);
        if (definiteFailure(error)) {
          handle.clear();
          setPending(null);
          setConfirmation(null);
        }
        if (
          error instanceof ApiError &&
          [
            "CART_CHANGED",
            "PRICE_CHANGED",
            "OUT_OF_STOCK",
            "PRODUCT_UNAVAILABLE",
          ].includes(error.code)
        ) {
          setConflict(true);
          toast.error(errorMessage(error));
        } else {
          toast.error(errorMessage(error));
        }
        throw error;
      }
    } catch (error) {
      if (!(error instanceof ApiError)) toast.error(errorMessage(error));
    } finally {
      await client.invalidateQueries();
      setPaying(false);
    }
  }
  const confirmationTotal =
    confirmation?.items.reduce(
      (sum, r) => sum + r.unitPriceCents * r.quantity,
      0,
    ) ?? 0;
  const confirmationAddress = addresses.data?.items.find(
    (a) => a.id === confirmation?.addressId,
  );
  return (
    <div
      className={`trade-cart${showMobileCheckout ? " trade-cart-with-checkout-bar" : ""}`}
    >
      <PageTitle
        title="购物车"
        description="选好商品与收货地址，使用模拟余额一次结算。"
        action={
          <Link className="btn btn-secondary" to="/shop">
            继续逛商铺
            <ArrowUpRight size={15} />
          </Link>
        }
      />
      {pending && (
        <section className="notice trade-pending" role="status">
          <h2>上一笔结算结果待确认</h2>
          <p>
            原操作包含 {pending.items.length} 种商品、{pendingQuantity} 件，合计{" "}
            {money(pendingTotal)}
            。确认期间请保留原参数，重试会使用同一操作编号。
          </p>
          <button
            className="btn"
            disabled={paying}
            onClick={() => void checkout(pending)}
          >
            {paying ? <Spinner /> : <CreditCard size={16} />}确认原结算结果
          </button>
        </section>
      )}
      {receipt && (
        <section className="panel trade-receipt" aria-live="polite">
          <h2>结算成功</h2>
          <p>
            已从模拟余额支付 {money(receipt.totalCents)}，生成{" "}
            {receipt.orders.length} 笔已支付订单。
          </p>
          <div className="trade-receipt-orders">
            {receipt.orders.map((order) => (
              <Link
                className="text-link"
                key={order.id}
                to={`/studio/orders/${order.id}`}
              >
                {order.productTitle} · {order.quantity} 件
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
          <Link className="text-link" to="/studio/orders">
            查看全部订单
          </Link>
        </section>
      )}
      {conflict && (
        <p className="notice" role="alert">
          已重新加载购物车。请检查最新单价、库存和数量，再重新确认结算。
        </p>
      )}
      <QueryState query={cart}>
        {({ items }) =>
          items.length ? (
            <div className="trade-checkout-layout">
              <section className="trade-cart-items" aria-label="购物车商品">
                <div className="trade-cart-select-all">
                  <label className="trade-check-label">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={locked}
                      onChange={() =>
                        setSelected(
                          allSelected
                            ? new Set()
                            : new Set(
                                availableRows.slice(0, 50).map((r) => r.id),
                              ),
                        )
                      }
                    />
                    全选可购买商品
                  </label>
                  <span className="small muted">
                    共 {items.length} 种 · 每次最多结算 50 种
                  </span>
                </div>
                {items.map((row) => {
                  const product = row.product;
                  const draft = drafts[row.id] ?? String(row.quantity);
                  const quantity = Number(draft);
                  const changed = draft !== String(row.quantity);
                  const editable = !!product && product.stock > 0;
                  const canUpdate =
                    editable &&
                    Number.isInteger(quantity) &&
                    quantity >= 1 &&
                    quantity <= Math.min(99, product?.stock ?? 0);
                  return (
                    <article
                      className={`trade-cart-row ${!row.available ? "trade-cart-unavailable" : ""}`}
                      key={row.id}
                    >
                      <input
                        type="checkbox"
                        className="trade-cart-checkbox"
                        aria-label={`选择${product?.title || "失效商品"}`}
                        checked={selected.has(row.id)}
                        disabled={
                          locked || (!row.available && !selected.has(row.id))
                        }
                        onChange={(e) =>
                          setSelected((old) => {
                            const next = new Set(old);
                            if (e.target.checked) next.add(row.id);
                            else next.delete(row.id);
                            return next;
                          })
                        }
                      />
                      <Link
                        className="trade-cart-thumbnail"
                        to={`/shop/${row.productId}`}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        {product?.images[0] ? (
                          <img src={product.images[0].url} alt="" />
                        ) : (
                          <Package size={26} />
                        )}
                      </Link>
                      <div className="trade-cart-main">
                        <h2>
                          <Link to={`/shop/${row.productId}`}>
                            {product?.title || "商品已不可用"}
                          </Link>
                        </h2>
                        {product && (
                          <p className="small muted">
                            {product.seller.displayName} · 单价{" "}
                            {money(product.priceCents)} · 库存 {product.stock}
                          </p>
                        )}
                        {!row.available && (
                          <p className="small danger">
                            商品已下架、缺货或暂不可购买，请移除或稍后再试。
                          </p>
                        )}
                        <div className="trade-cart-quantity">
                          <label htmlFor={`cart-qty-${row.id}`}>数量</label>
                          <input
                            id={`cart-qty-${row.id}`}
                            type="number"
                            min={1}
                            max={Math.min(99, product?.stock ?? 0)}
                            value={draft}
                            disabled={locked || !editable}
                            onChange={(e) =>
                              setDrafts((old) => ({
                                ...old,
                                [row.id]: e.target.value,
                              }))
                            }
                          />
                          {changed && (
                            <button
                              className="text-link"
                              disabled={locked || !canUpdate}
                              onClick={() =>
                                change.mutate({
                                  productId: row.productId,
                                  quantity,
                                })
                              }
                            >
                              保存数量
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="trade-cart-end">
                        <strong>
                          {product
                            ? money(
                                product.priceCents *
                                  (Number.isFinite(quantity) ? quantity : 0),
                              )
                            : "—"}
                        </strong>
                        <button
                          className="icon-btn danger"
                          aria-label={`移除${product?.title || "失效商品"}`}
                          disabled={locked}
                          onClick={() => remove.mutate(row.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>
              <aside className="panel trade-checkout-summary">
                <h2>结算明细</h2>
                <QueryState query={addresses}>
                  {({ items: list }) => (
                    <AddressSelection
                      addresses={list}
                      value={pending?.addressId || addressId}
                      onChange={setAddressId}
                      disabled={locked}
                    />
                  )}
                </QueryState>
                <dl className="trade-summary-lines">
                  <div>
                    <dt>已选商品</dt>
                    <dd>
                      {chosen.length} 种 ·{" "}
                      {chosen.reduce(
                        (sum, r) =>
                          sum +
                          (Number.isFinite(quantityOf(r)) ? quantityOf(r) : 0),
                        0,
                      )}{" "}
                      件
                    </dd>
                  </div>
                  <div>
                    <dt>合计</dt>
                    <dd className="trade-total">{money(total)}</dd>
                  </div>
                  <div>
                    <dt>可用模拟余额</dt>
                    <dd>
                      {wallet.data
                        ? money(wallet.data.balanceCents)
                        : wallet.isError
                          ? "暂时无法读取"
                          : "正在读取…"}
                    </dd>
                  </div>
                </dl>
                {wallet.data && valid && total > wallet.data.balanceCents && (
                  <p className="notice">模拟余额不足，请先前往钱包充值。</p>
                )}
                <button
                  className="btn btn-wide"
                  disabled={checkoutDisabled}
                  onClick={review}
                >
                  <CreditCard size={17} />
                  核对并结算
                </button>
                {dirty && (
                  <p className="small notice">请先保存修改后的数量。</p>
                )}
                {chosen.length > 50 && (
                  <p className="small notice">
                    每次最多结算 50 种商品，请减少选择。
                  </p>
                )}
                {chosen.some(
                  (r) =>
                    !r.available ||
                    (r.product && quantityOf(r) > r.product.stock),
                ) && (
                  <p className="small notice">
                    所选商品中存在不可购买或库存不足的商品，请调整选择或数量。
                  </p>
                )}
                <Link className="text-link" to="/studio/wallet">
                  前往模拟钱包
                  <ArrowUpRight size={14} />
                </Link>
                <p className="small muted">
                  结算成功后一次扣款，每种商品生成一笔已支付订单。任一商品无法购买时，整笔结算不会扣款。此为教学模拟交易。
                </p>
              </aside>
            </div>
          ) : (
            <Empty
              title="购物车还空着"
              description="先去商铺看看，喜欢的商品可以一起结算。"
              icon={<ShoppingCart size={28} />}
              action={
                <Link className="btn btn-secondary" to="/shop">
                  前往商铺
                </Link>
              }
            />
          )
        }
      </QueryState>
      {showMobileCheckout && (
        <div
          className="trade-mobile-checkout"
          role="region"
          aria-label="快捷结算"
        >
          <div>
            <span>
              已选 {chosen.length} 种 · {chosenQuantity} 件
            </span>
            <strong>{money(total)}</strong>
          </div>
          <button className="btn" disabled={checkoutDisabled} onClick={review}>
            结算已选商品
          </button>
        </div>
      )}
      <Modal
        title="确认批量结算"
        description="请核对收货信息和金额，确认后将扣除模拟余额。"
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !paying) setConfirmation(null);
        }}
      >
        {confirmation && (
          <div className="form-stack">
            {confirmationAddress && (
              <AddressPreview address={confirmationAddress} />
            )}
            <div className="trade-confirm-items">
              {confirmation.items.map((item) => (
                <div key={item.cartItemId}>
                  <span>
                    {rows.find((r) => r.id === item.cartItemId)?.product
                      ?.title || "商品"}{" "}
                    × {item.quantity}
                  </span>
                  <strong>{money(item.unitPriceCents * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="purchase-total">
              <span>{confirmation.items.length} 种商品 · 合计</span>
              <strong>{money(confirmationTotal)}</strong>
            </div>
            <button
              className="btn btn-wide"
              disabled={paying || !!pending}
              onClick={() => void checkout(confirmation)}
            >
              {paying ? <Spinner /> : <CreditCard size={17} />}确认支付{" "}
              {money(confirmationTotal)}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
