import { usePlanner } from "@/store/plannerStore";
import { Login } from "@/components/Login";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = usePlanner();

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
}
