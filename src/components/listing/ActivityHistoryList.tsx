export interface ActivityHistoryItem {
  timestamp: string;
  user: string;
  action: string;
  description: string;
}

interface ActivityHistoryListProps {
  activities: ActivityHistoryItem[];
  className?: string;
}

export function ActivityHistoryList({ activities, className = '' }: ActivityHistoryListProps) {
  if (activities.length === 0) {
    return (
      <p className={`text-sm text-zinc-400 font-medium ${className}`}>
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="md:hidden space-y-3">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-2 text-xs text-zinc-600"
          >
            <div>
              <span className="font-bold text-zinc-400 uppercase text-[10px]">Data e hora</span>
              <p className="mt-0.5">{new Date(activity.timestamp).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <span className="font-bold text-zinc-400 uppercase text-[10px]">Usuário</span>
              <p className="mt-0.5 break-words">{activity.user}</p>
            </div>
            <div>
              <span className="font-bold text-zinc-400 uppercase text-[10px]">Ação</span>
              <p className="mt-0.5 break-words">{activity.action}</p>
            </div>
            <div>
              <span className="font-bold text-zinc-400 uppercase text-[10px]">Descrição</span>
              <p className="mt-0.5 break-words">{activity.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2 mb-2">
          <div>Data e hora</div>
          <div>Usuário</div>
          <div>Ação</div>
          <div>Descrição</div>
        </div>
        <div className="space-y-0">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="grid grid-cols-4 text-xs text-zinc-600 py-3 border-b border-zinc-50"
            >
              <div>{new Date(activity.timestamp).toLocaleString('pt-BR')}</div>
              <div className="truncate pr-2">{activity.user}</div>
              <div className="truncate pr-2">{activity.action}</div>
              <div className="truncate">{activity.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
