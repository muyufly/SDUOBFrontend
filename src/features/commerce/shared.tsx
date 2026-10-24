import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Address } from "@/api/types";
import { ApiError } from "@/api/client";
import { SelectControl } from "@/components/ui/select-control";

export function definiteFailure(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.code !== "INVALID_RESPONSE"
  );
}

export function AddressPreview({
  address,
}: {
  address: Pick<Address, "recipientName" | "phone" | "addressLine">;
}) {
  return (
    <div className="trade-address-preview">
      <strong>
        {address.recipientName} <span>{address.phone}</span>
      </strong>
      <p>{address.addressLine}</p>
    </div>
  );
}

export function AddressSelection({
  addresses,
  value,
  onChange,
  disabled = false,
}: {
  addresses: Address[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (!disabled && !addresses.some((a) => a.id === value)) {
      onChange((addresses.find((a) => a.isDefault) || addresses[0])?.id || "");
    }
  }, [addresses, value, onChange, disabled]);
  const selected = addresses.find((a) => a.id === value);
  return (
    <section className="trade-address-selection">
      <div className="trade-section-heading">
        <h2>
          <MapPin size={16} /> 收货信息
        </h2>
        <Link className="text-link" to="/studio/addresses">
          管理地址簿
        </Link>
      </div>
      {addresses.length ? (
        <>
          <SelectControl
            aria-label="选择收货地址"
            value={value}
            disabled={disabled}
            onValueChange={onChange}
            options={addresses.map((a) => ({
              value: a.id,
              label: `${a.isDefault ? "默认 · " : ""}${a.label ? `${a.label} · ` : ""}${a.recipientName} ${a.phone}`,
            }))}
          />
          {selected && <AddressPreview address={selected} />}
          {!selected && disabled && (
            <p className="small muted">将按原操作中的地址确认交易。</p>
          )}
        </>
      ) : (
        <p className="notice">
          {disabled ? (
            "原地址已不在地址簿中，请先确认原操作结果。"
          ) : (
            <>
              请先
              <Link className="text-link" to="/studio/addresses">
                添加收货地址
              </Link>
              ，再继续下单。
            </>
          )}
        </p>
      )}
    </section>
  );
}
