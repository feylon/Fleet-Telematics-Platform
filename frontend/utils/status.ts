export type LiveStatus = 'MOVING' | 'IDLE' | 'OFFLINE' | 'EMERGENCY';

export const STATUS_COLORS: Record<LiveStatus, string> = {
  MOVING: '#16a34a',
  IDLE: '#f59e0b',
  OFFLINE: '#6b7280',
  EMERGENCY: '#dc2626',
};

export const statusColor = (status: string): string => STATUS_COLORS[status as LiveStatus] ?? STATUS_COLORS.OFFLINE;

export const vehicleIconSvg = (status: string, heading: number, size = 34): string => {
  const color = statusColor(status);
  const rotation = Math.round(((heading % 360) + 360) % 360);
  const pulse = status === 'EMERGENCY' ? ' pulse-emergency' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="vehicle-svg${pulse}" width="${size}" height="${size}" viewBox="0 0 40 40"><g transform="rotate(${rotation} 20 20)"><path d="M20 3 L31 33 L20 27 L9 33 Z" fill="${color}" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></g><circle cx="20" cy="20" r="4" fill="#ffffff" opacity="0.9"/></svg>`;
};

export const vehiclePillHtml = (status: string, heading: number, label: string, selected = false): string => {
  const color = statusColor(status);
  const rotation = Math.round(((heading % 360) + 360) % 360);
  const pulse = status === 'EMERGENCY' ? ' pulse-emergency' : '';
  const ring = selected ? '<span class="vehicle-ring"></span>' : '';
  return `${ring}<div class="vehicle-pill${selected ? ' is-selected' : ''}"><span class="vehicle-arrow${pulse}" style="background:${color}"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" style="transform:rotate(${rotation}deg)"><path d="M12 2 20 21 12 17 4 21Z"/></svg></span><span>${label}</span></div>`;
};

export const severityColor = (severity: string): string => {
  if (severity === 'CRITICAL') return '#dc2626';
  if (severity === 'WARNING') return '#f59e0b';
  return '#0ea5e9';
};
