import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={['flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8', className].join(' ')}>
      <div>
        <h1 className="text-4xl md:text-5xl font-semibold text-zinc-900 tracking-tight">{title}</h1>
        {subtitle ? <p className="text-zinc-500 mt-2 text-base max-w-2xl">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
