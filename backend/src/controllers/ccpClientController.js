import { fetchCcpClientById, fetchCcpClients } from '../services/ccpClientService.js';
import User from '../models/User.js';
import ClientPortalDataUpload from '../models/ClientPortalDataUpload.js';
import Notification from '../models/Notification.js';
import { getTeamUserIdsForManager, getTeamUserIdsForOperationHead, normalizeNameKey } from '../services/userService.js';

export const getCcpClients = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const activeOnly = req.query.activeOnly !== 'false';
    const dashboardScope = req.query.scope === 'dashboard';
    const clients = await filterCcpClientsForUser(await fetchCcpClients({ activeOnly }), req.user?.id, {
      includeScope: true,
      dashboardScope,
    });
    res.json({
      source: 'ccp',
      activeOnly,
      clients,
    });
  } catch (error) {
    next(error);
  }
};

export const getCcpClientDashboardStats = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const allClients = await fetchCcpClients({ activeOnly: true });
    const visibleClients = await filterCcpClientsForUser(allClients, req.user?.id, {
      includeScope: true,
      dashboardScope: true,
    });
    const user = await User.findById(req.user?.id).populate('roleId').lean();
    const roleName = String(user?.roleId?.roleName || '').toLowerCase();
    const isComplianceRole = roleName === 'compliance' || roleName === 'compliance manager';
    const currentFinancialYear = getCurrentFinancialYear();
    const selectedFinancialYear = String(req.query?.financialYear || currentFinancialYear).trim();
    const visibleClientIds = [...new Set(visibleClients.flatMap(getClientIdentifierCandidates))];

    let visibleUserIds = [req.user?.id].filter(Boolean);
    if (roleName === 'manager') {
      visibleUserIds = await getTeamUserIdsForManager(req.user.id);
    } else if (roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin') {
      const users = await User.find({}).select('_id').lean();
      visibleUserIds = users.map((item) => String(item._id));
    }

    const [visibleUsers, dashboardSpocUsers, uploadRecords, unreadNotificationCount] = await Promise.all([
      User.find({ _id: { $in: visibleUserIds } })
        .select('name normalizedName roleId designation avatarUrl')
        .populate('roleId', 'roleName')
        .lean(),
      User.find({ _id: { $in: visibleUserIds }, isActive: { $ne: false }, status: { $ne: 'inactive' } })
        .select('name normalizedName roleId designation avatarUrl')
        .populate('roleId', 'roleName')
        .lean(),
      ClientPortalDataUpload.find({
        ccpClientId: { $in: visibleClientIds },
      }).select('ccpClientId updatedBy purchase sales prePost eprTarget eprCredit gst reusePlan allScreenshots preConsumer state annualConsumption financialYears activeFinancialYear').lean(),
      Notification.countDocuments({ recipientId: req.user?.id, financialYear: selectedFinancialYear, isRead: false }),
    ]);

    const userMap = new Map(visibleUsers.map((item) => [String(item._id), item]));
    const currentUserKey = String(req.user?.id || '');
    const selectedUploadRecords = uploadRecords.map((record) => ({
      record,
      upload: getUploadForFinancialYear(record, selectedFinancialYear),
    }));
    const completedPurchaseUploads = selectedUploadRecords.filter(({ upload }) => (
      hasUploadedFile(upload?.purchase?.baseData) && hasUploadedFile(upload?.purchase?.portalUpload)
    ));
    const pendingComplianceCount = completedPurchaseUploads
      .filter(({ upload }) => (
        isComplianceRole
          ? upload?.purchase?.managerVerificationStatus === 'Approved'
            && upload?.purchase?.complianceVerificationStatus !== 'Approved'
          : upload?.purchase?.managerVerificationStatus !== 'Approved'
      ))
      .length;

    const initialBreakdown = visibleUsers
      .filter((item) => String(item._id) !== currentUserKey)
      .map((item) => ({
        userId: String(item._id),
        name: item.name,
        count: 0,
      }));
    const teamBreakdownMap = new Map(initialBreakdown.map((item) => [item.userId, item]));
    const assignedUserBreakdownMap = new Map(visibleUsers.map((item) => [String(item._id), {
      userId: String(item._id),
      name: item.name,
      role: item.roleId?.roleName || item.designation || 'User',
      avatarUrl: item.avatarUrl || '',
      count: 0,
    }]));
    const eligibleSpocUsers = dashboardSpocUsers
      .filter((item) => isDashboardSpocUser(item))
      .sort((first, second) => String(first.name || '').localeCompare(String(second.name || '')));
    const spocUserMap = new Map(eligibleSpocUsers.map((item) => [String(item._id), item]));
    const userPiboCategoryMap = new Map(eligibleSpocUsers.map((item) => [String(item._id), createEmptyUserPiboRow(item)]));
    const piboCategoryMap = new Map();
    const purchaseChecklistMap = new Map();
    const salesChecklistMap = new Map();
    const annualFilingStatusByClient = [];
    const uploadRecordByClientId = new Map(uploadRecords.map((record) => [String(record.ccpClientId), record]));

    let managerClientCount = 0;
    let teamClientCount = 0;
    let unassignedClientCount = 0;

    visibleClients.forEach((client) => {
      const piboCategory = normalizeDashboardCategory(client?.piboCategory);
      piboCategoryMap.set(piboCategory, (piboCategoryMap.get(piboCategory) || 0) + 1);

      const clientId = String(client?.id || client?.sourceId || client?._id || '');
      const clientUploadRecord = getUploadRecordForClient(client, uploadRecordByClientId);
      const selectedUpload = getUploadForFinancialYear(clientUploadRecord, selectedFinancialYear);
      const annualFilingStatus = getAnnualFilingStatus(client, clientUploadRecord, selectedFinancialYear);
      annualFilingStatusByClient.push({ ccpClientId: clientId, category: piboCategory, ...annualFilingStatus });
      const uploadOwnerId = String(selectedUpload?.purchase?.submittedBy || selectedUpload?.updatedBy || clientUploadRecord?.updatedBy || '');
      const matchedOwnerId = findClientOwnerUserId(client, visibleUsers) || uploadOwnerId;
      const dashboardOwnerId = findClientOwnerUserId(client, eligibleSpocUsers) || uploadOwnerId;
      const checklistOwner = matchedOwnerId && userMap.has(String(matchedOwnerId))
        ? { userId: String(matchedOwnerId), name: userMap.get(String(matchedOwnerId))?.name || 'User' }
        : { userId: '', name: client?.clientOwnerName || 'Unassigned' };

      addClientToChecklistSummary(purchaseChecklistMap, client, selectedUpload?.purchase?.progressRows, checklistOwner);
      if (canShowSalesChecklist(client?.piboCategory)) {
        addClientToChecklistSummary(salesChecklistMap, client, selectedUpload?.sales?.progressRows, checklistOwner);
      }

      if (dashboardOwnerId && spocUserMap.has(String(dashboardOwnerId))) {
        const row = userPiboCategoryMap.get(String(dashboardOwnerId));
        const bucket = getUserPiboCategoryBucket(client?.piboCategory);
        row[bucket] += 1;
        if (isAnnualFilingApplicable(client?.firstAnnualReturnYear, selectedFinancialYear)) {
          row.clientForAnnualFiling += 1;
        } else {
          row.clientNotForAnnualFiling += 1;
        }
      }

      if (matchedOwnerId && assignedUserBreakdownMap.has(String(matchedOwnerId))) {
        assignedUserBreakdownMap.get(String(matchedOwnerId)).count += 1;
      } else {
        unassignedClientCount += 1;
      }

      if (matchedOwnerId && String(matchedOwnerId) === currentUserKey) {
        managerClientCount += 1;
        return;
      }

      if (matchedOwnerId && teamBreakdownMap.has(String(matchedOwnerId))) {
        teamBreakdownMap.get(String(matchedOwnerId)).count += 1;
        teamClientCount += 1;
        return;
      }

      if (roleName === 'manager') {
        teamClientCount += 1;
      } else {
        managerClientCount += 1;
      }
    });

    res.json({
      ok: true,
      stats: {
        totalVisibleClients: visibleClients.length,
        managerClientCount,
        teamClientCount,
        pendingComplianceCount,
        notificationCount: unreadNotificationCount,
        teamBreakdown: [...teamBreakdownMap.values()].sort((first, second) => second.count - first.count),
        piboCategoryBreakdown: [...piboCategoryMap.entries()]
          .map(([category, count]) => {
            const statuses = annualFilingStatusByClient.filter((item) => item.category === category);
            const applicableCount = statuses.filter((item) => item.status !== 'notApplicable').length;
            const completedCount = statuses.filter((item) => item.status === 'completed').length;
            return {
              category,
              count,
              applicableCount,
              completedCount,
              inProgressCount: applicableCount - completedCount,
              notApplicableCount: count - applicableCount,
              completionPercentage: applicableCount ? Math.round((completedCount / applicableCount) * 100) : 0,
            };
          })
          .sort((first, second) => second.count - first.count || first.category.localeCompare(second.category)),
        annualFilingFinancialYear: selectedFinancialYear,
        annualFilingStatusByClient,
        assignedUserBreakdown: [...assignedUserBreakdownMap.values()]
          .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name)),
        userPiboCategoryBreakdown: [...userPiboCategoryMap.values()]
          .sort((first, second) => second.clientForAnnualFiling - first.clientForAnnualFiling || first.name.localeCompare(second.name)),
        ccpDebug: {
          source: process.env.CCP_API_BASE_URL?.replace(/\/$/, '') || 'not-configured',
          selectedFinancialYear,
          fetchedActiveClientCount: allClients.length,
          visibleClientCount: visibleClients.length,
          eligibleSpocCount: eligibleSpocUsers.length,
          withFirstAnnualReturnYear: visibleClients.filter((client) => Boolean(client.firstAnnualReturnYear)).length,
          withoutFirstAnnualReturnYear: visibleClients.filter((client) => !client.firstAnnualReturnYear).length,
        },
        purchaseChecklistBreakdown: sortChecklistSummaryRows([...purchaseChecklistMap.values()]),
        salesChecklistBreakdown: sortChecklistSummaryRows([...salesChecklistMap.values()]),
        unassignedClientCount,
        uploadTimings: selectedUploadRecords.map(({ record, upload }) => {
          const submittedById = String(upload?.purchase?.submittedBy || upload?.updatedBy || record?.updatedBy || '');
          return {
            ccpClientId: String(record.ccpClientId),
            userId: submittedById,
            userName: userMap.get(submittedById)?.name || '',
            sections: dashboardUploadSections.map(({ key, label }) => {
              const section = upload?.[key] || {};
              const sectionUserId = String(section?.submittedBy || upload?.updatedBy || record?.updatedBy || '');
              return {
                key,
                label,
                userId: sectionUserId,
                userName: userMap.get(sectionUserId)?.name || '',
                receivedDate: section?.startDate || toDashboardDate(section?.baseData?.uploadedAt),
                portalUploadDate: section?.endDate || toDashboardDate(section?.portalUpload?.uploadedAt),
                managerStatus: section?.managerVerificationStatus || '',
                complianceStatus: section?.complianceVerificationStatus || '',
              };
            }),
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

const dashboardUploadSections = [
  { key: 'purchase', label: 'Purchase Data' },
  { key: 'sales', label: 'Sales Data' },
  { key: 'prePost', label: 'Pre/Post Data' },
  { key: 'eprTarget', label: 'EPR Target' },
  { key: 'preConsumer', label: 'Pre Consumer' },
  { key: 'state', label: 'Statewise' },
  { key: 'annualConsumption', label: 'Annual Consumption' },
];

const userPiboCategoryColumns = [
  { key: 'simpProducerSmallMicro', patterns: [/\bsimp\s*producer\s*small\s*micro\b/, /\bproducer\s*small\s*micro\b/] },
  { key: 'simpImporterRaw', patterns: [/\bsimp\s*importer\s*raw\b/] },
  { key: 'simpSeller', patterns: [/\bsimp\s*seller\b/] },
  { key: 'simpProducer', patterns: [/\bsimp\s*producer\b/] },
  { key: 'brandOwner', patterns: [/\bbrand\s*owner\b/, /\bbrandowner\b/] },
  { key: 'pwp', patterns: [/\bpwp\b/] },
  { key: 'importer', patterns: [/\bimporter\b/] },
  { key: 'producer', patterns: [/\bproducer\b/] },
];

const checklistColumns = [
  { key: 'receivedFromClient', particular: 'received from client' },
  { key: 'partiallyDataReceived', particular: 'partially data received' },
  { key: 'completeDataReceived', particular: 'complete data received' },
  { key: 'workInProcess', particular: 'work in process' },
  { key: 'readyToUpload', particular: 'ready to upload' },
  { key: 'partiallyComplete', particular: 'partially complete' },
  { key: 'nilUpload', particular: 'nil upload' },
  { key: 'clientApprovalOnData', particular: 'client approval on data' },
  { key: 'uploadComplete', particular: 'upload complete' },
];

const checklistCategoryLabels = {
  producer: 'PRODUCER',
  importer: 'IMPORTER',
  brandOwner: 'BRAND OWNER',
  simpProducerSmallMicro: 'PRODUCER (SIMP SMALL-MICRO)',
  pwp: 'PWP',
  simpProducer: 'PRODUCER (SIMP)',
  simpImporterRaw: 'IMPORTER (SIMP RAW)',
  simpSeller: 'SELLER (SIMP)',
};

const checklistCategoryOrder = Object.keys(checklistCategoryLabels);

function normalizeDashboardCategory(value) {
  if (Array.isArray(value)) {
    const categories = value.map((item) => String(item || '').trim()).filter(Boolean);
    return categories.join(', ') || 'Not specified';
  }

  return String(value || '').trim() || 'Not specified';
}

function isDashboardSpocUser(user = {}) {
  const roleName = String(user?.roleId?.roleName || user?.designation || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const excludedRoles = new Set(['admin', 'super admin', 'superadmin', 'compliance', 'compliance manager']);
  return Boolean(user?._id && user?.name)
    && !excludedRoles.has(roleName)
    && !roleName.includes('admin')
    && !roleName.includes('compliance');
}

function createEmptyUserPiboRow(user = {}) {
  return userPiboCategoryColumns.reduce((row, column) => ({
    ...row,
    [column.key]: 0,
  }), {
    userId: String(user._id),
    name: user.name || 'User',
    clientForAnnualFiling: 0,
    clientNotForAnnualFiling: 0,
  });
}

function getUserPiboCategoryBucket(value) {
  const normalized = String(Array.isArray(value) ? value.join(' ') : value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const matchedColumn = userPiboCategoryColumns.find((column) => (
    column.patterns.some((pattern) => pattern.test(normalized))
  ));
  if (matchedColumn) return matchedColumn.key;
  return 'brandOwner';
}

function createEmptyChecklistSummaryRow(categoryKey) {
  return checklistColumns.reduce((row, column) => ({
    ...row,
    [column.key]: 0,
  }), {
    categoryKey,
    category: checklistCategoryLabels[categoryKey] || 'OTHER',
    totalClients: 0,
    userBreakdown: {},
  });
}

function addClientToChecklistSummary(summaryMap, client, progressRows, owner = {}) {
  const categoryKey = getUserPiboCategoryBucket(client?.piboCategory);
  if (!summaryMap.has(categoryKey)) {
    summaryMap.set(categoryKey, createEmptyChecklistSummaryRow(categoryKey));
  }

  const summary = summaryMap.get(categoryKey);
  const ownerKey = owner.userId || `name:${String(owner.name || 'Unassigned').toLowerCase()}`;
  if (!summary.userBreakdown[ownerKey]) {
    summary.userBreakdown[ownerKey] = checklistColumns.reduce((row, column) => ({
      ...row,
      [column.key]: 0,
    }), {
      userId: owner.userId || '',
      name: owner.name || 'Unassigned',
      totalClients: 0,
    });
  }

  const userSummary = summary.userBreakdown[ownerKey];
  summary.totalClients += 1;
  userSummary.totalClients += 1;
  const yesParticulars = new Set((Array.isArray(progressRows) ? progressRows : [])
    .filter((row) => String(row?.yesNo || '').trim().toLowerCase() === 'yes')
    .map((row) => normalizeChecklistParticular(row?.particular)));

  checklistColumns.forEach((column) => {
    if (yesParticulars.has(column.particular)) {
      summary[column.key] += 1;
      userSummary[column.key] += 1;
    }
  });
}

function sortChecklistSummaryRows(rows) {
  return rows
    .sort((first, second) => (
      checklistCategoryOrder.indexOf(first.categoryKey) - checklistCategoryOrder.indexOf(second.categoryKey)
      || first.category.localeCompare(second.category)
    ))
    .map(({ userBreakdown, ...row }) => ({
      ...row,
      users: Object.values(userBreakdown || {})
        .sort((first, second) => second.totalClients - first.totalClients || first.name.localeCompare(second.name)),
    }));
}

function normalizeChecklistParticular(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getClientIdentifierCandidates(client = {}) {
  const rawClient = client?.ccpData || {};
  return [
    client?.id,
    client?.sourceId,
    client?._id,
    client?.clientCode,
    rawClient?._id,
    rawClient?.id,
    rawClient?.data?.basic?.uniqueId,
    rawClient?.data?.basic?.clientCode,
    rawClient?.selectedLead?.leadCode,
  ].filter(Boolean).map(String);
}

function getUploadRecordForClient(client, uploadRecordMap) {
  const matchedId = getClientIdentifierCandidates(client).find((id) => uploadRecordMap.has(id));
  return matchedId ? uploadRecordMap.get(matchedId) : null;
}

function canShowSalesChecklist(piboCategory) {
  const normalized = String(Array.isArray(piboCategory) ? piboCategory.join(' ') : piboCategory || '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
  return /\bproducer\b/.test(normalized) || /\bimporter\b/.test(normalized);
}

function toDashboardDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

async function filterCcpClientsForUser(clients, userId, options = {}) {
  if (!userId) return clients;
  const user = await User.findById(userId).populate('roleId').lean();
  const roleName = String(user?.roleId?.roleName || '').toLowerCase();
  if (roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin') return clients;

  let visibleUserIds = [userId];
  if (!options.dashboardScope && roleName === 'operation') {
    visibleUserIds = await getTeamUserIdsForOperationHead(userId);
  } else if (roleName === 'manager') {
    visibleUserIds = await getTeamUserIdsForManager(userId);
  }

  const [visibleUsers, uploadedClientLinks] = await Promise.all([
    User.find({ _id: { $in: visibleUserIds } }).select('name normalizedName').lean(),
    ClientPortalDataUpload.find({
      $or: [
        { updatedBy: { $in: visibleUserIds } },
        { 'purchase.submittedBy': { $in: visibleUserIds } },
      ],
    }).select('ccpClientId updatedBy purchase.submittedBy').lean(),
  ]);
  const currentUserKey = String(userId);
  const visibleNames = new Set(visibleUsers.map((item) => item.normalizedName || normalizeNameKey(item.name)));
  const uploadOwnerByClientId = new Map(uploadedClientLinks.map((item) => [
    String(item.ccpClientId),
    String(item.purchase?.submittedBy || item.updatedBy),
  ]));
  const uploadedClientIds = new Set(uploadOwnerByClientId.keys());
  const userMap = new Map(visibleUsers.map((item) => [String(item._id), item]));

  return clients.reduce((items, client) => {
    const names = getOwnershipNameCandidates(client).map(normalizeNameKey);
    const clientId = String(client?.id || client?.sourceId || client?._id);
    const uploadOwnerId = uploadOwnerByClientId.get(clientId);
    const ownerUserId = findClientOwnerUserId(client, visibleUsers) || uploadOwnerId;
    const visible = uploadedClientIds.has(clientId) || names.some((name) => visibleNames.has(name));

    if (!visible) return items;

    if (!options.includeScope) {
      items.push(client);
      return items;
    }

    const owner = ownerUserId ? userMap.get(String(ownerUserId)) : null;
    items.push({
      ...client,
      clientScope: ownerUserId && String(ownerUserId) === currentUserKey ? 'manager' : 'team',
      clientOwnerName: owner?.name || '',
    });
    return items;
  }, []);
}

function findClientOwnerUserId(client, users) {
  const names = getOwnershipNameCandidates(client).map(normalizeNameKey);
  const matchedUser = users.find((user) => {
    const userName = user.normalizedName || normalizeNameKey(user.name);
    return names.includes(userName);
  });
  return matchedUser?._id ? String(matchedUser._id) : '';
}

function hasUploadedFile(file) {
  return Boolean(file?.name || file?.dataUrl || file?.uploadedAt);
}

function getCurrentFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 3 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function getAnnualFilingStatus(client, uploadRecord, financialYear) {
  if (!isAnnualFilingApplicable(client?.firstAnnualReturnYear, financialYear)) {
    return { status: 'notApplicable', requiredSections: 0, approvedSections: 0 };
  }

  const financialYears = uploadRecord?.financialYears instanceof Map
    ? Object.fromEntries(uploadRecord.financialYears)
    : (uploadRecord?.financialYears || {});
  const upload = financialYears[financialYear]
    || (uploadRecord && (!uploadRecord.activeFinancialYear || uploadRecord.activeFinancialYear === financialYear) ? uploadRecord : null);
  const category = String(client?.piboCategory || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const requiredSections = ['purchase', 'prePost', 'eprCredit', 'allScreenshots'];
  if (/\bproducer\b/.test(category) || /\bimporter\b/.test(category)) requiredSections.push('sales');
  if (/\bimporter\b/.test(category)) requiredSections.push('gst');
  if (/\bbrand\s+owner\b/.test(category) || /\bbrandowner\b/.test(category)) requiredSections.push('reusePlan');

  const approvedSections = requiredSections.filter((section) => (
    upload?.[section]?.managerVerificationStatus === 'Approved'
    && upload?.[section]?.complianceVerificationStatus === 'Approved'
  )).length;

  return {
    status: approvedSections === requiredSections.length ? 'completed' : 'inProgress',
    requiredSections: requiredSections.length,
    approvedSections,
  };
}

function getUploadForFinancialYear(record, financialYear) {
  if (!record) return null;
  const financialYears = record.financialYears instanceof Map
    ? Object.fromEntries(record.financialYears)
    : (record.financialYears || {});
  return financialYears[financialYear]
    || (!record.activeFinancialYear || record.activeFinancialYear === financialYear ? record : null);
}

function isAnnualFilingApplicable(firstAnnualReturnYear, selectedFinancialYear) {
  const firstStartYear = Number.parseInt(String(firstAnnualReturnYear || '').slice(0, 4), 10);
  const selectedStartYear = Number.parseInt(String(selectedFinancialYear || '').slice(0, 4), 10);
  return Number.isFinite(firstStartYear) && Number.isFinite(selectedStartYear) && selectedStartYear >= firstStartYear;
}

function getOwnershipNameCandidates(client) {
  const rawClient = client?.ccpData || {};
  return [
    client?.assignedToName,
    client?.createdByName,
    rawClient?.data?.importMeta?.assignedTo,
    rawClient?.data?.importMeta?.createdBy,
    rawClient?.assignedToText,
    rawClient?.assignedToName,
    typeof rawClient?.assignedTo === 'string' ? rawClient.assignedTo : '',
    rawClient?.assignedTo?.name,
    rawClient?.adminControls?.assignedToText,
    rawClient?.adminControls?.assignedToName,
    typeof rawClient?.adminControls?.assignedTo === 'string' ? rawClient.adminControls.assignedTo : '',
    rawClient?.adminControls?.assignedTo?.name,
    rawClient?.createdByText,
    rawClient?.createdByName,
    typeof rawClient?.createdBy === 'string' ? rawClient.createdBy : '',
    rawClient?.createdBy?.name,
  ].filter((value) => typeof value === 'string' && value.trim());
}

export const getCcpClient = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    const client = await fetchCcpClientById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found in CCP' });
    res.json({ source: 'ccp', client });
  } catch (error) {
    next(error);
  }
};
