import React from 'react';
import { DocumentStatus } from '../types';
import { CheckCircle2, Clock, XCircle, AlertTriangle, AlertOctagon, Archive } from 'lucide-react';

interface StatusBadgeProps {
  status: DocumentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = () => {
    switch (status) {
      case DocumentStatus.VERIFIED:
        return {
          label: 'VERIFIED',
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
          dot: 'bg-emerald-500',
        };
      case DocumentStatus.PENDING_VERIFICATION:
        return {
          label: 'PENDING VERIFICATION',
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          icon: <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
          dot: 'bg-blue-500',
        };
      case DocumentStatus.REJECTED:
        return {
          label: 'REJECTED',
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
          dot: 'bg-rose-500',
        };
      case DocumentStatus.EXPIRED:
        return {
          label: 'EXPIRED',
          bg: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
          dot: 'bg-orange-500',
        };
      case DocumentStatus.NOT_UPLOADED:
        return {
          label: 'NOT UPLOADED',
          bg: 'bg-slate-100 border-slate-200 text-slate-600 font-medium',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          dot: 'bg-slate-500',
        };
      case DocumentStatus.ARCHIVED:
      default:
        return {
          label: 'ARCHIVED',
          bg: 'bg-slate-100 border-slate-200 text-slate-600',
          icon: <Archive className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide whitespace-nowrap ${config.bg} ${sizeClasses}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </span>
  );
};
