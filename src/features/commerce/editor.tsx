import { SelectControl } from "@/components/ui/select-control";
import { useEffect, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, errorMessage } from "@/api/client";
import { useApi } from "@/api/hooks";
import type { Product } from "@/api/types";
import {
  MediaPicker,
  Modal,
  PageTitle,
  QueryState,
  Spinner,
} from "@/components/common";
import { parseCents, money } from "@/lib/format";
function fields(p?: Product) {
  return {
    title: p?.title || "",
    description: p?.description || "",
    sellerContact: p?.sellerContact || "",
    images: p?.images || [],
    price: p ? (p.priceCents / 100).toFixed(2) : "",
    stock: p?.stock ?? 0,
    status: p?.status || ("DRAFT" as Product["status"]),
  };
}
export function ProductEditorPage() {
  const { id } = useParams();
  const query = useApi<Product>(`/products/${id}`, !!id);
  return id ? (
    <QueryState query={query}>
      {(p) => <ProductForm key={p.id} initial={p} />}
    </QueryState>
  ) : (
    <ProductForm key="new" />
  );
}
function ProductForm({ initial }: { initial?: Product }) {
  const [value, setValue] = useState(() => fields(initial));
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(fields(initial)),
  );
  const [version, setVersion] = useState(initial?.version);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<Product | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const nav = useNavigate();
  const client = useQueryClient();
  const dirty = JSON.stringify(value) !== baseline;
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  async function save(mergedVersion?: number) {
    const cents = parseCents(value.price);
    if (cents === null || cents < 1 || cents > 1000000) {
      toast.error("价格应为 0.01–10000.00 元，最多两位小数。");
      return;
    }
    if (
      !Number.isInteger(value.stock) ||
      value.stock < 0 ||
      value.stock > 100000
    ) {
      toast.error("库存应为 0–100000 的整数。");
      return;
    }
    if (uncertain) return;
    setSaving(true);
    try {
      const result = await api<Product>(
        initial ? `/products/${initial.id}` : "/products",
        {
          method: initial ? "PUT" : "POST",
          body: {
            title: value.title,
            description: value.description,
            sellerContact: value.sellerContact,
            imageIds: value.images.map((i) => i.id),
            priceCents: cents,
            stock: value.stock,
            status: value.status,
            ...(initial ? { version: mergedVersion ?? version } : {}),
          },
        },
      );
      setVersion(result.version);
      setValue(fields(result));
      setBaseline(JSON.stringify(fields(result)));
      setConflict(null);
      await client.invalidateQueries();
      toast.success("商品已保存");
      nav("/studio/products");
    } catch (error) {
      toast.error(errorMessage(error));
      if (
        initial &&
        error instanceof ApiError &&
        error.code === "VERSION_CONFLICT"
      ) {
        try {
          setConflict(await api<Product>(`/products/${initial.id}`));
        } catch {
          toast.error("暂时无法读取最新版本，当前编辑已保留。");
        }
      } else if (
        !initial &&
        (!(error instanceof ApiError) ||
          error.status === 0 ||
          error.code === "INVALID_RESPONSE" ||
          error.status >= 500)
      )
        setUncertain(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Link to="/studio/products" className="back-link">
        <ArrowLeft size={16} />
        商品管理
      </Link>
      <PageTitle
        title={initial ? "编辑商品" : "为好物写一份介绍"}
        description="价格、库存和状态会影响交易，请在保存前核对。"
      />
      {initial?.hidden && (
        <p className="notice">商品已被隐藏，保存或上架不会解除隐藏。</p>
      )}
      {uncertain && (
        <p className="notice error">
          创建结果未确认，请先前往商品列表核对。当前输入仍然保留，避免重复创建。
        </p>
      )}
      <form
        className="product-editor form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="field">
          <span>商品名称</span>
          <input
            value={value.title}
            required
            maxLength={100}
            onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
          />
        </label>
        <label className="field">
          <span>商品介绍</span>
          <textarea
            rows={6}
            value={value.description}
            required
            maxLength={5000}
            onChange={(e) =>
              setValue((v) => ({ ...v, description: e.target.value }))
            }
          />
        </label>
        <MediaPicker
          value={value.images}
          onChange={(images) => setValue((v) => ({ ...v, images }))}
          label="商品图片"
        />
        <div className="form-columns">
          <label className="field trade-contact-field">
            <span>卖家联系方式（选填）</span>
            <input
              value={value.sellerContact}
              maxLength={200}
              placeholder="联系电话、微信或其他联系渠道"
              onChange={(e) =>
                setValue((v) => ({ ...v, sellerContact: e.target.value }))
              }
            />
            <small>
              会公开展示在商品页，并保存在订单中。请填写你愿意公开的联系方式。
            </small>
          </label>
          <label className="field">
            <span>价格（元）</span>
            <input
              inputMode="decimal"
              value={value.price}
              required
              placeholder="0.00"
              onChange={(e) =>
                setValue((v) => ({ ...v, price: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>库存</span>
            <input
              type="number"
              min={0}
              max={100000}
              step={1}
              value={value.stock}
              required
              onChange={(e) =>
                setValue((v) => ({ ...v, stock: Number(e.target.value) }))
              }
            />
          </label>
          <label className="field">
            <span>商品状态</span>
            <SelectControl
              aria-label="商品状态"
              value={value.status}
              onValueChange={(status) =>
                setValue((v) => ({
                  ...v,
                  status: status as Product["status"],
                }))
              }
              options={[
                { value: "DRAFT", label: "草稿" },
                { value: "ON_SALE", label: "上架出售" },
                { value: "OFF_SALE", label: "下架" },
              ]}
            />
          </label>
        </div>
        <div className="button-row">
          <button className="btn" disabled={saving || uncertain || !!conflict}>
            {saving ? <Spinner /> : <Save size={16} />}保存商品
          </button>
        </div>
      </form>
      <Modal
        title="商品已有更新，请核对库存与内容"
        description="交易或管理操作也会改变版本。确认合并后再保存，避免恢复已售出的库存。"
        open={!!conflict}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      >
        {conflict && (
          <>
            <div className="conflict-comparison">
              <section>
                <h3>服务器 · 版本 {conflict.version}</h3>
                <p>{conflict.title}</p>
                <p>{conflict.description}</p>
                <p>联系方式：{conflict.sellerContact || "未填写"}</p>
                <p>
                  {money(conflict.priceCents)} · 库存 {conflict.stock} ·{" "}
                  {conflict.status}
                </p>
                <small>图片 {conflict.images.length} 张</small>
              </section>
              <section>
                <h3>当前编辑</h3>
                <p>{value.title}</p>
                <p>{value.description}</p>
                <p>联系方式：{value.sellerContact || "未填写"}</p>
                <p>
                  {value.price} 元 · 库存 {value.stock} · {value.status}
                </p>
                <small>图片 {value.images.length} 张</small>
              </section>
            </div>
            <p className="small muted">
              可关闭窗口修改当前表单，或直接采用服务器内容。
            </p>
            <div className="button-row">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setValue(fields(conflict));
                  setBaseline(JSON.stringify(fields(conflict)));
                  setVersion(conflict.version);
                  setConflict(null);
                }}
              >
                采用服务器版本
              </button>
              <button
                className="btn"
                disabled={saving}
                onClick={() => void save(conflict.version)}
              >
                已核对，保存合并内容
              </button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title="离开商品编辑？"
        description="尚未保存的修改将会丢失。"
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
      >
        <div className="button-row">
          <button
            className="btn btn-secondary"
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            继续编辑
          </button>
          <button
            className="btn"
            onClick={() => blocker.state === "blocked" && blocker.proceed()}
          >
            放弃修改
          </button>
        </div>
      </Modal>
    </>
  );
}
