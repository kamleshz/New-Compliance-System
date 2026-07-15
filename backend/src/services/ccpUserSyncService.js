const getCcpConfig = () => {
  const baseUrl = process.env.CCP_API_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) return null;

  return {
    baseUrl,
    apiKey: process.env.CCP_API_KEY,
    userSyncPath: process.env.CCP_USER_SYNC_PATH || '/users/sync',
  };
};

export const syncUserToCcp = async (user) => {
  const config = getCcpConfig();
  if (!config) return { skipped: true };

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['x-ccp-api-key'] = config.apiKey;

  const response = await fetch(`${config.baseUrl}${config.userSyncPath}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      crmUserId: user._id,
      name: user.name,
      normalizedName: user.normalizedName,
      email: user.email,
      role: user.roleId?.roleName || user.designation,
      teamId: user.teamId || user.departmentId,
      teamName: user.teamName || user.departmentId?.departmentName,
      managerId: user.managerId,
      operationHeadId: user.operationHeadId,
      avatarUrl: user.avatarUrl || user.avatar,
      isActive: user.isActive,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || 'Unable to sync user to CCP');
  }

  return body;
};
