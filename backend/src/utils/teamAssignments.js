export function normalizeReferenceIds(...values) {
  const ids = new Set();
  const add = (value) => {
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    const id = value?._id || value?.id || value;
    if (id) ids.add(String(id));
  };

  values.forEach(add);
  return [...ids];
}

export function collectActiveComplianceManagers(teams = []) {
  const recipients = new Map();

  teams.forEach((team) => {
    const managers = [...(team?.operationHeads || []), team?.operationHead].filter(Boolean);
    managers.forEach((manager) => {
      if (!manager?._id || manager.isActive === false || manager.status === 'inactive') return;
      recipients.set(String(manager._id), {
        _id: manager._id,
        name: manager.name || 'Compliance Manager',
        email: manager.email || '',
      });
    });
  });

  return [...recipients.values()];
}
