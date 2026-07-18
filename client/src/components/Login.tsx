import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Lock } from "lucide-react";
import { usePlanner } from "@/store/plannerStore";

export function Login() {
  const { login, syncStatus, syncError } = usePlanner();
  const [password, setPasswordInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    await login(password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8 bg-slate-900 border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">HRC Lab</h1>
            <p className="text-xs text-orange-400">Planner de Conteúdo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Senha de acesso
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              autoFocus
              placeholder="••••••••"
            />
          </div>

          {syncStatus === "error" && syncError && (
            <p className="text-sm text-red-400">{syncError}</p>
          )}

          <Button
            type="submit"
            disabled={submitting || !password}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
