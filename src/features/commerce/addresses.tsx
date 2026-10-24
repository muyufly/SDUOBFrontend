import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Plus, Save, ShoppingCart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Address } from "@/api/types";
import { api, errorMessage } from "@/api/client";
import { useApi, useAction } from "@/api/hooks";
import {
  Confirm,
  Empty,
  Modal,
  PageTitle,
  QueryState,
  Spinner,
} from "@/components/common";
import { AddressPreview } from "./shared";

type AddressFields = Pick<
  Address,
  "recipientName" | "phone" | "addressLine" | "label" | "isDefault"
>;
const emptyAddress: AddressFields = {
  recipientName: "",
  phone: "",
  addressLine: "",
  label: "",
  isDefault: false,
};

export function AddressesPage() {
  const query = useApi<{ items: Address[] }>("/me/addresses");
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const remove = useAction(async (id: string) => {
    setRemoving(id);
    try {
      return await api(`/me/addresses/${id}`, { method: "DELETE" });
    } finally {
      setRemoving(null);
    }
  }, "地址已删除");
  const setDefault = useAction(
    (address: Address) =>
      api<Address>(`/me/addresses/${address.id}`, {
        method: "PUT",
        body: {
          recipientName: address.recipientName,
          phone: address.phone,
          addressLine: address.addressLine,
          label: address.label,
          isDefault: true,
        },
      }),
    "默认地址已更新",
  );
  const busy = remove.isPending || setDefault.isPending;
  return (
    <div className="trade-address-book">
      <PageTitle
        title="地址簿"
        description="保存收货人和联系方式，下单时直接选择。订单保留成交时的信息。"
        action={
          <button
            className="btn"
            disabled={busy}
            onClick={() => setEditing("new")}
          >
            <Plus size={16} />
            新增地址
          </button>
        }
      />
      <div className="trade-links">
        <Link className="text-link" to="/studio/cart">
          <ShoppingCart size={16} />
          前往购物车
        </Link>
      </div>
      <QueryState query={query}>
        {({ items }) =>
          items.length ? (
            <div className="trade-address-list">
              {items.map((address) => (
                <article className="trade-address-row" key={address.id}>
                  <div className="trade-address-main">
                    <div className="trade-address-labels">
                      <h2>{address.label || "收货地址"}</h2>
                      {address.isDefault && (
                        <span className="badge">默认地址</span>
                      )}
                    </div>
                    <AddressPreview address={address} />
                  </div>
                  <div className="button-row">
                    {!address.isDefault && (
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => setDefault.mutate(address)}
                      >
                        设为默认
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      disabled={busy}
                      onClick={() => setEditing(address)}
                    >
                      编辑
                    </button>
                    <Confirm
                      title="删除这个地址？"
                      description="已创建订单中的收货信息会继续保留。"
                      disabled={busy}
                      onConfirm={() => remove.mutate(address.id)}
                    >
                      {removing === address.id ? <Spinner /> : "删除"}
                    </Confirm>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="添加第一个收货地址"
              description="填写收货人、电话和详细地址，方便之后购买与联系。"
              icon={<MapPin size={28} />}
              action={
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditing("new")}
                >
                  <Plus size={16} />
                  新增地址
                </button>
              }
            />
          )
        }
      </QueryState>
      <Modal
        title={editing === "new" ? "新增收货地址" : "编辑收货地址"}
        description="收货信息仅用于你参与的交易。"
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing && (
          <AddressForm
            key={typeof editing === "string" ? editing : editing.id}
            initial={editing === "new" ? undefined : editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function AddressForm({
  initial,
  onSaved,
}: {
  initial?: Address;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<AddressFields>(
    initial
      ? {
          recipientName: initial.recipientName,
          phone: initial.phone,
          addressLine: initial.addressLine,
          label: initial.label,
          isDefault: initial.isDefault,
        }
      : emptyAddress,
  );
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  async function save() {
    const body = {
      ...value,
      recipientName: value.recipientName.trim(),
      phone: value.phone.trim(),
      addressLine: value.addressLine.trim(),
      label: value.label.trim(),
    };
    if (!body.recipientName || !body.phone || !body.addressLine) {
      toast.error("请填写收货人、联系电话和详细地址。");
      return;
    }
    if (body.phone.length < 3 || !/^[+\d()\s-]+$/.test(body.phone)) {
      toast.error("联系电话至少 3 位，可包含数字、加号、括号、空格和短横线。");
      return;
    }
    setSaving(true);
    try {
      await api<Address>(
        initial ? `/me/addresses/${initial.id}` : "/me/addresses",
        { method: initial ? "PUT" : "POST", body },
      );
      await client.invalidateQueries();
      toast.success("收货地址已保存");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="field">
        <span>收货人</span>
        <input
          required
          autoComplete="name"
          maxLength={100}
          value={value.recipientName}
          disabled={saving}
          onChange={(e) =>
            setValue((v) => ({ ...v, recipientName: e.target.value }))
          }
        />
      </label>
      <label className="field">
        <span>联系电话</span>
        <input
          required
          type="tel"
          autoComplete="tel"
          minLength={3}
          maxLength={50}
          value={value.phone}
          disabled={saving}
          onChange={(e) => setValue((v) => ({ ...v, phone: e.target.value }))}
        />
      </label>
      <label className="field">
        <span>详细地址</span>
        <textarea
          required
          rows={3}
          autoComplete="street-address"
          placeholder="地区、街道、楼栋和门牌号"
          maxLength={1000}
          value={value.addressLine}
          disabled={saving}
          onChange={(e) =>
            setValue((v) => ({ ...v, addressLine: e.target.value }))
          }
        />
      </label>
      <label className="field">
        <span>地址标签（选填）</span>
        <input
          placeholder="例如：宿舍、家"
          maxLength={50}
          value={value.label}
          disabled={saving}
          onChange={(e) => setValue((v) => ({ ...v, label: e.target.value }))}
        />
      </label>
      <label className="trade-check-label">
        <input
          type="checkbox"
          checked={value.isDefault}
          disabled={saving}
          onChange={(e) =>
            setValue((v) => ({ ...v, isDefault: e.target.checked }))
          }
        />
        设为默认地址
      </label>
      <div className="button-row">
        <button className="btn" disabled={saving}>
          {saving ? <Spinner /> : <Save size={16} />}保存地址
        </button>
      </div>
    </form>
  );
}
