import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  description?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({ title, description, onBack, actions, children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="btn-icon btn-secondary shrink-0 mt-1"
                title="Go back"
                aria-label="Go back to previous page"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-heading-md text-gray-900 dark:text-gray-100">{title}</h1>
              {description && (
                <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
