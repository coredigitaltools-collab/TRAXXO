import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  value: string;
  onChange: (date: string) => void;
  onClose?: () => void;
}

export function Calendar({ value, onChange, onClose }: CalendarProps) {
  const [month, setMonth] = useState(value ? new Date(value + 'T00:00:00') : new Date());

  const year = month.getFullYear();
  const monthNum = month.getMonth();
  const firstDay = new Date(year, monthNum, 1);
  const lastDay = new Date(year, monthNum + 1, 0);
  const prevLastDay = new Date(year, monthNum, 0);

  const firstDayOfWeek = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const prevDays = prevLastDay.getDate();

  const days = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({ date: new Date(year, monthNum - 1, prevDays - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, monthNum, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, monthNum + 1, i), isCurrentMonth: false });
  }

  const handleDateClick = (d: Date) => {
    const dateStr = d.toISOString().split('T')[0];
    onChange(dateStr);
    onClose?.();
  };

  const prevMonth = () => setMonth(new Date(year, monthNum - 1, 1));
  const nextMonth = () => setMonth(new Date(year, monthNum + 1, 1));

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="btn-icon btn-secondary"><ChevronLeft size={18} /></button>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{monthNames[monthNum]} {year}</h3>
        <button onClick={nextMonth} className="btn-icon btn-secondary"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center h-8 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dateStr = d.date.toISOString().split('T')[0];
          const isSelected = dateStr === value;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={i}
              onClick={() => handleDateClick(d.date)}
              className={`h-8 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                  ? 'border-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : d.isCurrentMonth
                  ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              {d.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
}

export function DatePicker({ value, onChange, label, error }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className={`input cursor-pointer ${error ? 'input-error' : ''}`}
        />
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 z-50 mt-2">
              <Calendar value={value} onChange={onChange} onClose={() => setOpen(false)} />
            </div>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
