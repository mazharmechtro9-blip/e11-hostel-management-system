"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
const ToastContext = createContext<(message: string, error?: boolean) => void>(
  () => {},
);
export const useToast = () => useContext(ToastContext);
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, error) =>
              count < 1 &&
              !(
                error &&
                "status" in error &&
                [401, 403].includes(Number(error.status))
              ),
            refetchOnWindowFocus: false,
            staleTime: 15000,
          },
        },
      }),
  );
  const [toasts, setToasts] = useState<
    { id: number; message: string; error: boolean }[]
  >([]);
  const notify = useCallback((message: string, error = false) => {
    const id = Date.now();
    setToasts((t) => [...t.slice(-2), { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500);
  }, []);
  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={notify}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div className={`toast ${t.error ? "toast-error" : ""}`} key={t.id}>
              {t.error ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
              <span>{t.message}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
