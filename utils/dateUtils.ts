// utils/dateUtils.ts

export const formatDateTimeTbilisi = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleString('ka-GE', {
    timeZone: 'Asia/Tbilisi',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTbilisi = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ka-GE', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatShortDateTbilisi = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleDateString('ka-GE', {
    timeZone: 'Asia/Tbilisi',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTimeTbilisi = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('ka-GE', {
    timeZone: 'Asia/Tbilisi',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
};
