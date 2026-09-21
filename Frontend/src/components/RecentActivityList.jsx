function RecentActivityList({ activities = [] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-primary">Recent activity</h2><span className="text-xs text-text-muted">Audit log</span></div>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No recent activity.</p>
      ) : (
        <ul className="mt-4 max-h-64 overflow-y-auto divide-y divide-border pr-2">
          {activities.map((activity, index) => (
            <li key={activity.id || index} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0"><p className="truncate font-medium text-primary">{activity.action}</p><p className="mt-0.5 truncate text-xs text-text-secondary">{activity.details || "System activity"} · {activity.user_name || "Unknown user"}</p></div>
              <span className="shrink-0 text-[11px] text-text-muted">{activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecentActivityList;
