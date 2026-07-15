import ClientPurchaseOrder from '../models/ClientPurchaseOrder.js';
import User from '../models/User.js';
import { fetchCcpClients } from '../services/ccpClientService.js';
import { getTeamUserIdsForManager, getTeamUserIdsForOperationHead, normalizeNameKey } from '../services/userService.js';

export const getPurchaseOrderDashboardStatus = async (req, res, next) => {
  try {
    const [currentUser, clients, poRecords] = await Promise.all([
      User.findById(req.user?.id).populate('roleId').lean(),
      fetchCcpClients({ activeOnly: true }),
      ClientPurchaseOrder.find({}).lean(),
    ]);
    const roleName = normalizeRoleName(currentUser?.roleId?.roleName || currentUser?.designation);
    const visibleUserIds = await getVisibleUserIds(currentUser, roleName);
    const visibleUsers = await User.find({ _id: { $in: visibleUserIds }, isActive: { $ne: false }, status: { $ne: 'inactive' } })
      .populate('roleId', 'roleName')
      .select('name email normalizedName roleId designation avatarUrl')
      .lean();

    const userMap = new Map(visibleUsers.map((user) => [String(user._id), user]));
    const userNameMap = new Map(visibleUsers.map((user) => [
      user.normalizedName || normalizeNameKey(user.name),
      String(user._id),
    ]));
    const poRecordMap = new Map(poRecords.map((record) => [String(record.ccpClientId), record]));
    const currentFinancialYear = getCurrentFinancialYear();
    const financialYearSet = new Set([currentFinancialYear]);
    poRecords.forEach((record) => {
      (record.poYearRecords || []).forEach((yearRecord) => {
        if (yearRecord?.fyYear) financialYearSet.add(String(yearRecord.fyYear));
      });
    });
    const financialYears = [...financialYearSet].sort(compareFinancialYears);
    const userRows = new Map(visibleUsers.map((user) => [String(user._id), createUserPoRow(user, financialYears)]));
    let unassignedCount = 0;

    clients.forEach((client) => {
      const ownerUserId = findClientOwnerUserId(client, userNameMap);
      if (!ownerUserId || !userRows.has(ownerUserId)) {
        unassignedCount += 1;
        return;
      }

      const row = userRows.get(ownerUserId);
      const poRecord = poRecordMap.get(String(client.id || client.sourceId || client._id)) || null;
      const poByYear = new Map((poRecord?.poYearRecords || []).map((yearRecord) => [
        String(yearRecord.fyYear || ''),
        yearRecord,
      ]));

      financialYears.forEach((financialYear) => {
        const yearRecord = poByYear.get(financialYear);
        const received = Boolean(yearRecord?.poNumber && yearRecord?.poUpload?.dataUrl);
        const clientStatus = {
          ccpClientId: String(client.id || client.sourceId || client._id || ''),
          clientName: client.clientName || client.tradeName || 'Unnamed client',
          clientCode: client.clientCode || '',
          financialYear,
          poStatus: received ? 'Received' : 'Pending',
          poNumber: yearRecord?.poNumber || '',
          service: yearRecord?.service || '',
          services: Array.isArray(yearRecord?.services) && yearRecord.services.length
            ? yearRecord.services
            : (yearRecord?.service ? [yearRecord.service] : []),
          poFileName: yearRecord?.poUpload?.name || '',
          poFileUrl: yearRecord?.poUpload?.dataUrl || '',
          uploadedAt: yearRecord?.poUpload?.uploadedAt || '',
        };

        const fyRow = row.financialYears.find((item) => item.financialYear === financialYear);
        fyRow.totalClients += 1;
        fyRow.clients.push(clientStatus);
        if (received) {
          fyRow.poReceived += 1;
          row.poReceived += 1;
        } else {
          fyRow.poPending += 1;
          row.poPending += 1;
        }
      });

      row.totalClients += 1;
    });

    const users = [...userRows.values()]
      .filter((row) => row.totalClients > 0)
      .map((row) => ({
        ...row,
        financialYears: row.financialYears
          .filter((year) => year.totalClients > 0)
          .map((year) => ({
            ...year,
            clients: year.clients.sort((first, second) => first.clientName.localeCompare(second.clientName)),
          })),
      }))
      .sort((first, second) => second.totalClients - first.totalClients || first.name.localeCompare(second.name));

    res.json({
      ok: true,
      financialYears,
      unassignedCount,
      totals: users.reduce((total, row) => ({
        totalClients: total.totalClients + row.totalClients,
        poReceived: total.poReceived + row.poReceived,
        poPending: total.poPending + row.poPending,
      }), { totalClients: 0, poReceived: 0, poPending: 0 }),
      users,
    });
  } catch (error) {
    next(error);
  }
};

export const getClientPurchaseOrder = async (req, res, next) => {
  try {
    const record = await ClientPurchaseOrder.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    res.json({
      ok: true,
      purchaseOrder: record || {
        ccpClientId: req.params.ccpClientId,
        poReceived: true,
        poYearRecords: [],
        specialApprovalEmail: '',
        specialApprovalFiles: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAccountsPurchaseOrders = async (req, res, next) => {
  try {
    const [currentUser, clients, poRecords] = await Promise.all([
      User.findById(req.user?.id).populate('roleId').lean(),
      fetchCcpClients({ activeOnly: false }),
      ClientPurchaseOrder.find({ 'poYearRecords.0': { $exists: true } }).lean(),
    ]);
    const roleName = normalizeRoleName(currentUser?.roleId?.roleName || currentUser?.designation);
    const visibleUserIds = await getVisibleUserIds(currentUser, roleName);
    const visibleUsers = await User.find({ _id: { $in: visibleUserIds } })
      .select('name normalizedName')
      .lean();
    const visibleUserNameMap = new Map(visibleUsers.map((user) => [
      user.normalizedName || normalizeNameKey(user.name),
      String(user._id),
    ]));
    const allClientsVisible = isAdminRole(roleName) || roleName === 'accounts' || roleName === 'account';
    const clientMap = new Map();

    clients.forEach((client) => {
      const clientId = String(client.id || client.sourceId || client._id || '');
      const ownerUserId = findClientOwnerUserId(client, visibleUserNameMap);
      if (!allClientsVisible && !ownerUserId) return;
      clientMap.set(clientId, client);
    });

    const rows = poRecords.flatMap((record) => {
      const client = clientMap.get(String(record.ccpClientId));
      if (!client) return [];
      return (record.poYearRecords || []).map((yearRecord) => {
        const payments = Array.isArray(yearRecord.payments) ? yearRecord.payments : [];
        const amountReceived = payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
        const tdsAmount = payments.reduce((sum, payment) => sum + toMoney(payment.tdsAmount), 0);
        const poAmount = toMoney(yearRecord.poAmount);
        const settledAmount = amountReceived + tdsAmount;
        return {
          ccpClientId: String(record.ccpClientId),
          clientName: client.clientName || client.tradeName || client.companyName || 'Unnamed client',
          clientCode: client.clientCode || '',
          assignedUser: client.assignedToName || client.createdByName || client.clientOwnerName || '',
          yearRecordId: String(yearRecord._id),
          financialYear: yearRecord.fyYear || '',
          poNumber: yearRecord.poNumber || '',
          service: yearRecord.service || '',
          services: Array.isArray(yearRecord.services) && yearRecord.services.length
            ? yearRecord.services
            : (yearRecord.service ? [yearRecord.service] : []),
          poFileName: yearRecord.poUpload?.name || '',
          poFileUrl: yearRecord.poUpload?.dataUrl || '',
          poAmount,
          payments,
          amountReceived,
          tdsAmount,
          settledAmount,
          outstandingAmount: Math.max(0, poAmount - settledAmount),
          paymentStatus: getPaymentStatus(poAmount, settledAmount),
          accountsRemarks: yearRecord.accountsRemarks || '',
          updatedAt: record.updatedAt,
        };
      });
    }).sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)));

    res.json({ ok: true, accounts: rows });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrderAccounts = async (req, res, next) => {
  try {
    const record = await ClientPurchaseOrder.findOne({ ccpClientId: req.params.ccpClientId });
    if (!record) return res.status(404).json({ message: 'Purchase order record not found.' });
    const yearRecord = record.poYearRecords.id(req.params.yearRecordId);
    if (!yearRecord) return res.status(404).json({ message: 'Financial-year PO record not found.' });

    const poAmount = toMoney(req.body?.poAmount);
    const payments = Array.isArray(req.body?.payments) ? req.body.payments : [];
    yearRecord.poAmount = poAmount;
    yearRecord.accountsRemarks = String(req.body?.accountsRemarks || '').trim();
    yearRecord.payments = payments
      .filter((payment) => payment?.paymentDate && toMoney(payment?.amount) + toMoney(payment?.tdsAmount) > 0)
      .map((payment) => ({
        ...(payment?._id ? { _id: payment._id } : {}),
        paymentDate: payment.paymentDate,
        paymentMode: normalizePaymentMode(payment.paymentMode),
        amount: toMoney(payment.amount),
        tdsAmount: toMoney(payment.tdsAmount),
        reference: String(payment.reference || '').trim(),
        proofFiles: normalizePaymentProofFiles(payment.proofFiles),
        remarks: String(payment.remarks || '').trim(),
        enteredBy: payment.enteredBy || req.user?.id,
      }));
    record.updatedBy = req.user?.id;
    await record.save();

    const amountReceived = yearRecord.payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0);
    const tdsAmount = yearRecord.payments.reduce((sum, payment) => sum + toMoney(payment.tdsAmount), 0);
    const settledAmount = amountReceived + tdsAmount;
    res.json({
      ok: true,
      account: {
        poAmount,
        payments: yearRecord.payments,
        amountReceived,
        tdsAmount,
        settledAmount,
        outstandingAmount: Math.max(0, poAmount - settledAmount),
        paymentStatus: getPaymentStatus(poAmount, settledAmount),
        accountsRemarks: yearRecord.accountsRemarks,
      },
    });
  } catch (error) {
    next(error);
  }
};

async function getVisibleUserIds(currentUser, roleName) {
  if (!currentUser?._id) return [];
  if (isAdminRole(roleName)) {
    const users = await User.find({}).select('_id').lean();
    return users.map((user) => String(user._id));
  }
  if (roleName === 'manager') return getTeamUserIdsForManager(currentUser._id);
  if (roleName === 'operation') return getTeamUserIdsForOperationHead(currentUser._id);
  return [String(currentUser._id)];
}

function createUserPoRow(user, financialYears) {
  return {
    userId: String(user._id),
    name: user.name || user.email || 'User',
    role: user.roleId?.roleName || user.designation || 'User',
    avatarUrl: user.avatarUrl || '',
    totalClients: 0,
    poReceived: 0,
    poPending: 0,
    financialYears: financialYears.map((financialYear) => ({
      financialYear,
      totalClients: 0,
      poReceived: 0,
      poPending: 0,
      clients: [],
    })),
  };
}

function findClientOwnerUserId(client, userNameMap) {
  const ownerNames = [
    client.assignedToName,
    client.createdByName,
    client.clientOwnerName,
  ].map(normalizeNameKey).filter(Boolean);
  const matchedName = ownerNames.find((name) => userNameMap.has(name));
  return matchedName ? userNameMap.get(matchedName) : '';
}

function normalizeRoleName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function isAdminRole(roleName) {
  return roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
}

function getCurrentFinancialYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function compareFinancialYears(first, second) {
  const firstYear = Number.parseInt(String(first).slice(0, 4), 10) || 0;
  const secondYear = Number.parseInt(String(second).slice(0, 4), 10) || 0;
  return secondYear - firstYear;
}

export const saveClientPurchaseOrder = async (req, res, next) => {
  try {
    const poReceived = Boolean(req.body?.poReceived);
    const poYearRecords = Array.isArray(req.body?.poYearRecords) ? req.body.poYearRecords : [];
    const specialApprovalFiles = Array.isArray(req.body?.specialApprovalFiles) ? req.body.specialApprovalFiles : [];

    const existingRecord = await ClientPurchaseOrder.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const existingYearRecords = existingRecord?.poYearRecords || [];
    const mergedPoYearRecords = poYearRecords.map((yearRecord) => {
      const exactMatch = existingYearRecords.find((item) => (
        (yearRecord?._id && String(item._id) === String(yearRecord._id))
        || (String(item.fyYear) === String(yearRecord.fyYear) && String(item.poNumber) === String(yearRecord.poNumber))
      ));
      const sameFinancialYearRecords = existingYearRecords.filter((item) => String(item.fyYear) === String(yearRecord.fyYear));
      const existing = exactMatch || (sameFinancialYearRecords.length === 1 ? sameFinancialYearRecords[0] : null);
      const services = normalizePurchaseOrderServices(yearRecord?.services, yearRecord?.service);
      return {
        ...yearRecord,
        fyYear: String(yearRecord?.fyYear || '').trim(),
        service: services[0] || '',
        services,
        poAmount: existing?.poAmount || 0,
        payments: existing?.payments || [],
        accountsRemarks: existing?.accountsRemarks || '',
      };
    });

    const record = await ClientPurchaseOrder.findOneAndUpdate(
      { ccpClientId: req.params.ccpClientId },
      {
        ccpClientId: req.params.ccpClientId,
        poReceived,
        poYearRecords: mergedPoYearRecords,
        specialApprovalEmail: req.body?.specialApprovalEmail || '',
        specialApprovalFiles,
        updatedBy: req.user?.id,
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    res.json({ ok: true, purchaseOrder: record });
  } catch (error) {
    next(error);
  }
};

function toMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function normalizePurchaseOrderServices(services, legacyService = '') {
  const values = Array.isArray(services) ? services : [legacyService];
  return [...new Set(values.map((service) => String(service || '').trim()).filter(Boolean))];
}

function normalizePaymentMode(value) {
  const mode = String(value || '').trim();
  return ['Bank Transfer', 'NEFT', 'UTR'].includes(mode) ? mode : '';
}

function normalizePaymentProofFiles(files) {
  return (Array.isArray(files) ? files : [])
    .filter((file) => file?.name && file?.dataUrl)
    .map((file) => ({
      ...(file?._id ? { _id: file._id } : {}),
      name: String(file.name).trim(),
      dataUrl: String(file.dataUrl),
      uploadedAt: file.uploadedAt || new Date(),
    }));
}

function getPaymentStatus(poAmount, settledAmount) {
  if (poAmount <= 0) return 'Amount Pending';
  if (settledAmount <= 0) return 'Payment Pending';
  if (settledAmount < poAmount) return 'Partially Received';
  if (settledAmount > poAmount) return 'Overpaid';
  return 'Complete Received';
}
