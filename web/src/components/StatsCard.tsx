export const StatsCard = ({ icon: Icon, color, title, value, unit }: any) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>{Icon}</div>
    <div><span>{title}</span><strong>{value}</strong><small>{unit}</small></div>
  </div>
);