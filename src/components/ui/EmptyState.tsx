import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={['apple-card text-center py-16 md:py-24 px-6 flex flex-col items-center gap-4', className].join(' ')}>
      {icon ? <div className="text-zinc-300 mb-2">{icon}</div> : null}
      <h3 className="text-xl font-semibold text-zinc-900 tracking-tight">{title}</h3>
      {description ? <p className="text-sm text-zinc-500 max-w-md">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
