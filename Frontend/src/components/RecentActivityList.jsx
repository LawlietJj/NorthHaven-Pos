function RecentActivityList({ activities = [] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-semibold text-primary">Recent activity</h2>
      {activities.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">No recent activity.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {activities.map((activity, index) => (
            <li key={activity.id || index} className="py-3 text-sm text-text-secondary">
              {activity.label || activity.name || activity}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecentActivityList;
