import React from 'react';

export const IncomeIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 19V5M5 12l7-7 7 7" />
    <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" stroke="none" />
  </svg>
);

export const ExpenseIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 5v14M5 12l7 7 7-7" />
    <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" stroke="none" />
  </svg>
);

export const TransactionIncomeIcon = ({ className }: { className?: string }) => (
  <div className={`w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 ${className}`}>
    <IncomeIcon className="w-4 h-4" />
  </div>
);

export const TransactionExpenseIcon = ({ className }: { className?: string }) => (
  <div className={`w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 ${className}`}>
    <ExpenseIcon className="w-4 h-4" />
  </div>
);
