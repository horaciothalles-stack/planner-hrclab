import { usePlanner } from "@/store/plannerStore";
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertTriangle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SyncIndicator() {
  const { syncStatus, syncError, syncNow, logout } = usePlanner();

  const config = {
    idle: { icon: Cloud, text: "Sincronizado", color: "text-gray-400" },
    loading: { icon: Loader2, text: "Carregando...", color: "text-blue-400 animate-spin" },
    saving: { icon: Loader2, text: "Salvando...", color: "text-blue-400 animate-spin" },
    saved: { icon: CheckCircle2, text: "Salvo na nuvem", color: "text-emerald-400" },
    offline: { icon: CloudOff, text: "Sem conexão (salvo só neste dispositivo)", color: "text-amber-400" },
    error: { icon: AlertTriangle, text: syncError || "Erro ao sincronizar", color: "text-red-400" },
  } as const;

  const { icon: Icon, text, color } = config[syncStatus];

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => syncNow()}
        className={`flex items-center gap-1.5 text-xs ${color} hover:opacity-80 transition-opacity`}
        title="Clique para forçar sincronização"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{text}</span>
      </button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-500 hover:text-gray-300" onClick={logout} title="Sair">
        <LogOut className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
