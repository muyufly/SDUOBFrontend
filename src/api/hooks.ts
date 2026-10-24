import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/app/auth";
import { api, errorMessage } from "./client";
export function useApi<T>(path: string, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["api", session?.userId ?? "guest", path],
    queryFn: ({ signal }) => api<T>(path, { signal }),
    enabled,
    retry: false,
  });
}
export function useAction<T, V = void>(
  action: (value: V) => Promise<T>,
  message?: string,
  onSuccess?: (value: T) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (value) => {
      void client.invalidateQueries();
      if (message) toast.success(message);
      onSuccess?.(value);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
