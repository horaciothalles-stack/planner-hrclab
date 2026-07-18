import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_LABEL, STATUS_ORDER, usePlanner, type PostStatus } from "@/store/plannerStore";
import { cn } from "@/lib/utils";

export const STATUS_COLOR: Record<PostStatus, string> = {
  rascunho: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  produzido: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  agendado: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  postado: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export const STATUS_DOT: Record<PostStatus, string> = {
  rascunho: "bg-slate-400",
  produzido: "bg-blue-400",
  agendado: "bg-amber-400",
  postado: "bg-emerald-400",
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        STATUS_COLOR[status],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

interface StatusControlProps {
  day: number;
  number: number;
  compact?: boolean;
}

export function StatusControl({ day, number, compact }: StatusControlProps) {
  const { getPostState, setPostStatus, setPostNotes } = usePlanner();
  const state = getPostState(day, number);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={state.status}
          onValueChange={(val) => setPostStatus(day, number, val as PostStatus)}
        >
          <SelectTrigger className={cn("bg-slate-800 border-slate-700 text-white", compact ? "w-[150px] h-8 text-xs" : "w-[180px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-white">
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {state.status === "agendado" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Data agendada</span>
            <Input
              type="date"
              value={state.scheduledDate || ""}
              onChange={(e) => setPostStatus(day, number, "agendado", { scheduledDate: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white h-8 w-[150px] text-xs"
            />
          </div>
        )}

        {state.status === "postado" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Data que postou</span>
            <Input
              type="date"
              value={state.postedDate || ""}
              onChange={(e) => setPostStatus(day, number, "postado", { postedDate: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white h-8 w-[150px] text-xs"
            />
          </div>
        )}
      </div>

      {!compact && (
        <Textarea
          placeholder="Notas rápidas (ex: link do post, ideia de ajuste, referência de criativo)..."
          value={state.notes || ""}
          onChange={(e) => setPostNotes(day, number, e.target.value)}
          className="bg-slate-800/60 border-slate-700 text-gray-200 text-sm min-h-[70px]"
        />
      )}
    </div>
  );
}
