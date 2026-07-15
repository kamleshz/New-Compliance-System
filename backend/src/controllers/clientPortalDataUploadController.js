import ClientPortalDataUpload from '../models/ClientPortalDataUpload.js';
import Department from '../models/Department.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { fetchCcpClientById, fetchCcpClients } from '../services/ccpClientService.js';
import { sendMail } from '../services/mailService.js';
import { getTeamUserIdsForManager, getTeamUserIdsForOperationHead } from '../services/userService.js';
import { calculateEprTargets, DEFAULT_OPTIONS } from '../services/eprTargetCalculationService.js';

export const getManagerPurchaseReviews = async (req, res, next) => {
  try {
    const financialYear = normalizeFinancialYear(req.query?.financialYear);
    const user = await User.findById(req.user?.id).populate('roleId').lean();
    const roleName = String(user?.roleId?.roleName || '').toLowerCase();
    let visibleUserIds = [req.user?.id].filter(Boolean);
    const isComplianceRole = roleName === 'compliance' || roleName === 'compliance manager';

    if (roleName === 'manager') {
      visibleUserIds = await getTeamUserIdsForManager(req.user.id);
    } else if (roleName === 'operation') {
      visibleUserIds = await getTeamUserIdsForOperationHead(req.user.id);
    } else if (isComplianceRole || roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin') {
      const users = await User.find({}).select('_id').lean();
      visibleUserIds = users.map((item) => String(item._id));
    }

    const [records, clients, users] = await Promise.all([
      ClientPortalDataUpload.find({ updatedBy: { $in: visibleUserIds } }).lean(),
      fetchCcpClients({ activeOnly: true }),
      User.find({ _id: { $in: visibleUserIds } }).select('name email').lean(),
    ]);

    const userMap = new Map(users.map((item) => [String(item._id), item]));
    const clientMap = new Map();
    clients.forEach((client) => {
      [client?.id, client?.sourceId, client?._id].filter(Boolean).forEach((id) => {
        clientMap.set(String(id), client);
      });
    });

    const reviewSections = [
      { key: 'purchase', label: 'Purchase Data', requirePortalUpload: true },
      { key: 'sales', label: 'Sales Data', requirePortalUpload: true },
      { key: 'eprCredit', label: 'EPR Credit', requirePortalUpload: false },
    ];
    const reviews = records
      .flatMap((record) => {
        const client = clientMap.get(String(record.ccpClientId));
        const updatedBy = userMap.get(String(record.updatedBy));
        const selectedRecord = financialYear ? getFinancialYearEntry(record, financialYear) : record;
        if (!selectedRecord) return [];
        return reviewSections
          .map((section) => {
            const upload = selectedRecord?.[section.key] || {};
            return { record, client, updatedBy, section, upload };
          })
          .filter(({ upload, section }) => (
            section.requirePortalUpload
              ? hasUploadedFile(upload?.baseData) && hasUploadedFile(upload?.portalUpload)
              : hasUploadedFile(upload?.baseData)
          ))
          .filter(({ upload }) => (
            isComplianceRole
              ? upload?.managerVerificationStatus === 'Approved'
                && upload?.complianceVerificationStatus !== 'Approved'
              : upload?.managerVerificationStatus !== 'Approved'
          ))
          .map(({ record: itemRecord, client: itemClient, updatedBy: itemUpdatedBy, section, upload }) => {
            const latestReview = getLatestManagerReview(upload);
            return {
              ccpClientId: itemRecord.ccpClientId,
              section: section.key,
              sectionLabel: section.label,
              clientName: getClientName(itemClient) || itemRecord.ccpClientId,
              clientCode: itemClient?.clientCode || itemClient?.data?.basic?.clientCode || '',
              uploadedBy: itemUpdatedBy?.name || itemUpdatedBy?.email || 'User',
              uploadedAt: itemRecord.updatedAt,
              managerVerificationStatus: upload?.managerVerificationStatus || 'Pending',
              complianceVerificationStatus: upload?.complianceVerificationStatus || (isComplianceRole ? 'Pending' : ''),
              reviewStatus: isComplianceRole
                ? upload?.complianceVerificationStatus || 'Pending'
                : upload?.managerVerificationStatus || 'Pending',
              reviewStage: isComplianceRole ? 'Compliance Manager' : 'Manager',
              managerReview: latestReview?.message || upload?.managerReview || '',
              receivedDate: upload?.startDate || '',
              portalUploadDate: upload?.endDate || '',
              financialYear,
            };
          });
      })
      .sort((first, second) => new Date(second.uploadedAt || 0) - new Date(first.uploadedAt || 0));

    res.json({ ok: true, reviews });
  } catch (error) {
    next(error);
  }
};

export const getClientPortalDataUpload = async (req, res, next) => {
  try {
    const record = await ClientPortalDataUpload.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const financialYear = normalizeFinancialYear(req.query?.financialYear);
    if (financialYear) {
      const yearRecord = getFinancialYearEntry(record, financialYear);
      if (!yearRecord) {
        return res.json({
          ok: true,
          exists: false,
          financialYear,
          portalDataUpload: emptyPortalDataUpload(req.params.ccpClientId),
        });
      }
      return res.json({
        ok: true,
        exists: true,
        financialYear,
        portalDataUpload: withDerivedUploadDates(yearRecord),
      });
    }
    res.json({
      ok: true,
      portalDataUpload: record ? withDerivedUploadDates(record) : emptyPortalDataUpload(req.params.ccpClientId),
    });
  } catch (error) {
    next(error);
  }
};

export const saveClientPortalDataUpload = async (req, res, next) => {
  try {
    const existingRecord = await ClientPortalDataUpload.findOne({ ccpClientId: req.params.ccpClientId }).lean();
    const financialYear = normalizeFinancialYear(req.body?.financialYear);
    const existingYearRecord = getFinancialYearEntry(existingRecord, financialYear);
    const nextPurchase = getNextUploadSection(req.body?.purchase, existingYearRecord?.purchase || existingRecord?.purchase, req.user?.id);
    const nextSales = getNextUploadSection(req.body?.sales, existingYearRecord?.sales || existingRecord?.sales, req.user?.id);
    const nextEprCredit = getNextUploadSection(
      req.body?.eprCredit,
      existingYearRecord?.eprCredit || existingRecord?.eprCredit,
      req.user?.id,
      { requirePortalUpload: false },
    );
    const handoffEmails = buildApprovalHandoffEmailJobs(existingYearRecord || existingRecord, {
      purchase: nextPurchase,
      sales: nextSales,
      eprCredit: nextEprCredit,
    });
    const nextYearRecord = {
      purchase: nextPurchase,
      sales: nextSales,
      prePost: req.body?.prePost || {},
      eprTarget: req.body?.eprTarget || {},
      eprCredit: nextEprCredit,
      gst: req.body?.gst || {},
      reusePlan: req.body?.reusePlan || {},
      allScreenshots: req.body?.allScreenshots || {},
      preConsumer: req.body?.preConsumer || {},
      state: req.body?.state || {},
      annualConsumption: req.body?.annualConsumption || {},
      updatedAt: new Date(),
      updatedBy: req.user?.id,
    };
    const existingFinancialYears = existingRecord?.financialYears instanceof Map
      ? Object.fromEntries(existingRecord.financialYears)
      : (existingRecord?.financialYears || {});
    const nextFinancialYears = {
      ...existingFinancialYears,
      ...(financialYear ? { [financialYear]: nextYearRecord } : {}),
    };
    const calculationOptions = {
      ...DEFAULT_OPTIONS,
      ...(existingRecord?.eprTargetCalculationOptions || {}),
    };
    const { brandOwnerRows, producerSalesRows, producerPreConsumerRows } = collectEprTargetRows({
      record: existingRecord || {},
      financialYears: nextFinancialYears,
      activeFinancialYear: financialYear || existingRecord?.activeFinancialYear || '',
    });
    const nextEprTargetCalculation = calculateEprTargets({
      brandOwnerRows,
      producerSalesRows,
      producerPreConsumerRows,
      options: calculationOptions,
    });

    const record = await ClientPortalDataUpload.findOneAndUpdate(
      { ccpClientId: req.params.ccpClientId },
      {
        ccpClientId: req.params.ccpClientId,
        purchase: nextPurchase,
        sales: nextSales,
        prePost: nextYearRecord.prePost,
        eprTarget: nextYearRecord.eprTarget,
        eprCredit: nextEprCredit,
        gst: nextYearRecord.gst,
        reusePlan: nextYearRecord.reusePlan,
        allScreenshots: nextYearRecord.allScreenshots,
        preConsumer: nextYearRecord.preConsumer,
        state: nextYearRecord.state,
        annualConsumption: nextYearRecord.annualConsumption,
        financialYears: nextFinancialYears,
        activeFinancialYear: financialYear || existingRecord?.activeFinancialYear || '',
        eprTargetCalculation: nextEprTargetCalculation,
        eprTargetCalculationOptions: calculationOptions,
        eprTargetCalculationUpdatedAt: new Date(),
        updatedBy: req.user?.id,
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    notifyApprovalHandoffs({
      jobs: handoffEmails,
      ccpClientId: req.params.ccpClientId,
      financialYear,
      actorId: req.user?.id,
    }).catch((error) => {
      console.error('[mail] Unable to send approval handoff email:', error.message);
    });

    const savedYearRecord = financialYear ? getFinancialYearEntry(record, financialYear) : null;
    res.json({
      ok: true,
      financialYear: financialYear || '',
      portalDataUpload: financialYear ? withDerivedUploadDates(savedYearRecord || nextYearRecord) : record,
    });
  } catch (error) {
    next(error);
  }
};

function normalizeFinancialYear(value) {
  return String(value || '').trim();
}

function getFinancialYearEntry(record, financialYear) {
  if (!record || !financialYear) return null;
  const financialYears = record.financialYears instanceof Map
    ? Object.fromEntries(record.financialYears)
    : (record.financialYears || {});
  return financialYears[financialYear] || null;
}

function collectEprTargetRows({ record = {}, financialYears = {}, activeFinancialYear = '' }) {
  const brandOwnerRows = [];
  const producerSalesRows = [];
  const producerPreConsumerRows = [];

  Object.entries(financialYears || {}).forEach(([year, yearRecord]) => {
    const prePostRows = yearRecord?.prePost?.portalUpload?.rows || [];
    prePostRows.forEach((row) => brandOwnerRows.push({ ...row, __fallbackFinancialYear: year }));

    const salesRows = yearRecord?.eprTarget?.baseData?.rows || [];
    salesRows.forEach((row) => producerSalesRows.push({ ...row, __fallbackFinancialYear: year }));

    const preConsumerRows = yearRecord?.eprTarget?.portalUpload?.rows || [];
    preConsumerRows.forEach((row) => producerPreConsumerRows.push({ ...row, __fallbackFinancialYear: year }));
  });

  const rootYear = activeFinancialYear || record?.activeFinancialYear || '';
  const rootPrePost = record?.prePost?.portalUpload?.rows || [];
  rootPrePost.forEach((row) => brandOwnerRows.push({ ...row, __fallbackFinancialYear: rootYear }));

  const rootSales = record?.eprTarget?.baseData?.rows || [];
  rootSales.forEach((row) => producerSalesRows.push({ ...row, __fallbackFinancialYear: rootYear }));

  const rootPreConsumer = record?.eprTarget?.portalUpload?.rows || [];
  rootPreConsumer.forEach((row) => producerPreConsumerRows.push({ ...row, __fallbackFinancialYear: rootYear }));

  return { brandOwnerRows, producerSalesRows, producerPreConsumerRows };
}

function emptyPortalDataUpload(ccpClientId) {
  const emptySection = () => ({ baseData: {}, portalUpload: {} });
  return {
    ccpClientId,
    purchase: emptySection(),
    sales: emptySection(),
    prePost: emptySection(),
    eprTarget: emptySection(),
    eprCredit: emptySection(),
    gst: emptySection(),
    reusePlan: emptySection(),
    allScreenshots: emptySection(),
    preConsumer: emptySection(),
    state: emptySection(),
    annualConsumption: emptySection(),
  };
}

function hasUploadedFile(file) {
  return Boolean(file?.name || file?.dataUrl || file?.uploadedAt);
}

function getNextUploadSection(nextSection = {}, existingSection = {}, userId, options = {}) {
  const nextUploadSection = { ...(nextSection || {}) };
  const requirePortalUpload = options?.requirePortalUpload !== false;
  const sectionHasFiles = hasUploadedFile(nextUploadSection?.baseData) || hasUploadedFile(nextUploadSection?.portalUpload);
  const sectionFilesChanged = hasUploadFileChanged(nextUploadSection?.baseData, existingSection?.baseData)
    || hasUploadFileChanged(nextUploadSection?.portalUpload, existingSection?.portalUpload);
  const readyForApproval = requirePortalUpload
    ? hasUploadedFile(nextUploadSection?.baseData) && hasUploadedFile(nextUploadSection?.portalUpload)
    : hasUploadedFile(nextUploadSection?.baseData);

  if (
    sectionFilesChanged
    && readyForApproval
    && nextUploadSection.managerVerificationStatus === 'Pending'
  ) {
    delete nextUploadSection.managerNotificationSentAt;
  }

  if (
    existingSection?.managerVerificationStatus !== 'Approved'
    && nextUploadSection.managerVerificationStatus === 'Approved'
    && nextUploadSection.complianceVerificationStatus === 'Pending'
  ) {
    delete nextUploadSection.complianceNotificationSentAt;
  }

  if (readyForApproval && !nextUploadSection.managerVerificationStatus) {
    nextUploadSection.managerVerificationStatus = 'Pending';
  }

  nextUploadSection.submittedBy = existingSection?.submittedBy
    || nextUploadSection.submittedBy
    || (sectionHasFiles ? userId : undefined);
  if (!nextUploadSection.startDate && hasUploadedFile(nextUploadSection.baseData)) {
    nextUploadSection.startDate = toDateInputValue(nextUploadSection.baseData?.uploadedAt);
  }
  if (!nextUploadSection.endDate && hasUploadedFile(nextUploadSection.portalUpload)) {
    nextUploadSection.endDate = toDateInputValue(nextUploadSection.portalUpload?.uploadedAt);
  }
  return nextUploadSection;
}

function withDerivedUploadDates(record) {
  const sectionKeys = ['purchase', 'sales', 'prePost', 'eprTarget', 'eprCredit', 'gst', 'reusePlan', 'allScreenshots', 'preConsumer', 'state', 'annualConsumption'];
  return sectionKeys.reduce((nextRecord, key) => {
    const section = nextRecord[key] || {};
    nextRecord[key] = {
      ...section,
      startDate: section.startDate || toDateInputValue(section.baseData?.uploadedAt),
      endDate: section.endDate || toDateInputValue(section.portalUpload?.uploadedAt),
    };
    return nextRecord;
  }, { ...record });
}

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function hasUploadFileChanged(nextFile = {}, existingFile = {}) {
  if (!hasUploadedFile(nextFile)) return false;
  if (!hasUploadedFile(existingFile)) return true;
  return String(nextFile.name || '') !== String(existingFile.name || '')
    || String(nextFile.uploadedAt || '') !== String(existingFile.uploadedAt || '');
}

function getClientName(client) {
  return client?.clientName
    || client?.data?.basic?.clientLegalName
    || client?.data?.basic?.clientName
    || client?.selectedLead?.company
    || client?.ccpData?.data?.basic?.clientLegalName
    || client?.ccpData?.data?.basic?.tradeName
    || '';
}

function getLatestManagerReview(purchase = {}) {
  const thread = Array.isArray(purchase.managerReviewThread) ? purchase.managerReviewThread : [];
  return thread.filter((entry) => entry?.message).at(-1);
}

function buildApprovalHandoffEmailJobs(existingRecord = {}, nextSections = {}) {
  const sections = [
    { key: 'purchase', label: 'Purchase Data', requirePortalUpload: true },
    { key: 'sales', label: 'Sales Data', requirePortalUpload: true },
    { key: 'eprCredit', label: 'EPR Credit', requirePortalUpload: false },
  ];

  return sections.flatMap((section) => {
    const previous = existingRecord?.[section.key] || {};
    const next = nextSections[section.key] || {};
    const jobs = [];
    const submittedById = String(next?.submittedBy || previous?.submittedBy || '').trim();
    const readyForApproval = section.requirePortalUpload
      ? hasUploadedFile(next?.baseData) && hasUploadedFile(next?.portalUpload)
      : hasUploadedFile(next?.baseData);

    if (
      readyForApproval
      && next?.managerVerificationStatus === 'Pending'
      && !previous?.managerNotificationSentAt
    ) {
      jobs.push({
        type: 'manager',
        eventType: 'user_to_manager',
        workflowStage: 'Manager',
        section,
        submittedById,
        notificationField: `${section.key}.managerNotificationSentAt`,
      });
    }

    if (
      next?.managerVerificationStatus === 'Approved'
      && previous?.managerVerificationStatus !== 'Approved'
      && next?.complianceVerificationStatus === 'Pending'
      && !previous?.complianceNotificationSentAt
    ) {
      jobs.push({
        type: 'compliance',
        eventType: 'manager_to_compliance',
        workflowStage: 'Compliance Manager',
        section,
        submittedById,
        notificationField: `${section.key}.complianceNotificationSentAt`,
      });
    }

    if (
      previous?.managerVerificationStatus !== 'Rejected'
      && next?.managerVerificationStatus === 'Rejected'
      && submittedById
    ) {
      jobs.push({
        type: 'submitter',
        eventType: 'manager_to_user',
        workflowStage: 'User',
        section,
        submittedById,
        reviewMessage: next?.managerReview || getLatestManagerReview(next)?.message || '',
      });
    }

    if (
      previous?.complianceVerificationStatus !== 'Rejected'
      && next?.complianceVerificationStatus === 'Rejected'
      && submittedById
    ) {
      jobs.push({
        type: 'submitter',
        eventType: 'compliance_to_user',
        workflowStage: 'User',
        section,
        submittedById,
        reviewMessage: next?.complianceReview || '',
      });
    }

    if (
      previous?.complianceVerificationStatus !== 'Approved'
      && next?.complianceVerificationStatus === 'Approved'
      && submittedById
    ) {
      jobs.push({
        type: 'submitter',
        eventType: 'compliance_approved',
        workflowStage: 'User',
        section,
        submittedById,
      });
    }

    return jobs;
  });
}

async function notifyApprovalHandoffs({ jobs, ccpClientId, financialYear, actorId }) {
  if (!jobs.length) return;

  const [actor, client] = await Promise.all([
    User.findById(actorId).populate('managerId roleId departmentId teamId').lean(),
    fetchCcpClientById(ccpClientId).catch(() => null),
  ]);
  const clientName = getClientName(client) || ccpClientId;

  await Promise.all(jobs.map(async (job) => {
    const recipients = await resolveNotificationRecipients(job);
    if (!recipients.length) return;

    const subject = getNotificationEmailSubject(job, clientName, financialYear);
    const message = getNotificationEmailMessage(job, clientName, financialYear, actor, ccpClientId);
    const html = getNotificationEmailHtml(job, clientName, financialYear, actor, ccpClientId);

    await Notification.insertMany(recipients.map((recipient) => ({
      recipientId: recipient._id,
      actorId: actorId || undefined,
      ccpClientId,
      financialYear: financialYear || '',
      section: job.section.key,
      sectionLabel: job.section.label,
      workflowStage: job.workflowStage,
      eventType: job.eventType,
      title: subject,
      message,
      link: `/clients/${encodeURIComponent(ccpClientId)}`,
      metadata: {
        clientName,
        reviewMessage: job.reviewMessage || '',
      },
    })));

    const emails = recipients.map((recipient) => recipient.email).filter(Boolean);
    if (emails.length) {
      await sendMail({
        to: emails,
        subject,
        text: message,
        html,
      });
    }

    if (job.notificationField) {
      const updateFields = { [job.notificationField]: new Date() };
      if (financialYear) {
        updateFields[`financialYears.${financialYear}.${job.notificationField}`] = new Date();
      }
      await ClientPortalDataUpload.updateOne(
        { ccpClientId },
        { $set: updateFields },
      );
    }
  }));
}

async function resolveNotificationRecipients(job) {
  let recipients = [];
  if (job.type === 'manager') {
    const submittedByUser = job.submittedById
      ? await User.findById(job.submittedById).populate('managerId roleId departmentId teamId').lean()
      : null;
    recipients = await getManagerUsersForUser(submittedByUser);
  } else if (job.type === 'compliance') {
    recipients = await getComplianceManagerUsers();
  } else if (job.type === 'submitter' && job.submittedById) {
    const user = await User.findById(job.submittedById).select('name email').lean();
    recipients = user ? [user] : [];
  }

  const adminUsers = await getAdminUsers();
  return uniqueNotificationRecipients([...recipients, ...adminUsers]);
}

async function getManagerUsersForUser(user) {
  if (!user?._id) return [];
  const recipients = new Map();
  if (user?.managerId?._id) recipients.set(String(user.managerId._id), {
    _id: user.managerId._id,
    name: user.managerId.name || 'Manager',
    email: user.managerId.email || '',
  });

  const teamIds = [user?.teamId?._id || user?.teamId, user?.departmentId?._id || user?.departmentId].filter(Boolean);
  const departments = await Department.find({
    $or: [
      ...(teamIds.length ? [{ _id: { $in: teamIds } }] : []),
      { members: user?._id },
    ],
  }).populate('manager', 'name email').lean();

  departments.forEach((department) => {
    if (department?.manager?._id) {
      recipients.set(String(department.manager._id), {
        _id: department.manager._id,
        name: department.manager.name || 'Manager',
        email: department.manager.email || '',
      });
    }
  });

  return [...recipients.values()];
}

async function getComplianceManagerUsers() {
  const users = await User.find({ isActive: { $ne: false }, status: { $ne: 'inactive' } })
    .populate('roleId')
    .select('name email roleId')
    .lean();

  return users
    .filter((user) => {
      const roleName = String(user?.roleId?.roleName || '').toLowerCase();
      return roleName === 'compliance' || roleName === 'compliance manager';
    })
    .map((user) => ({ _id: user._id, name: user.name || 'Compliance Manager', email: user.email || '' }))
    .filter((user) => user._id);
}

async function getAdminUsers() {
  const users = await User.find({ isActive: { $ne: false }, status: { $ne: 'inactive' } })
    .populate('roleId')
    .select('name email roleId')
    .lean();

  return users
    .filter((user) => isAdminRoleName(user?.roleId?.roleName))
    .map((user) => ({ _id: user._id, name: user.name || 'Admin', email: user.email || '' }))
    .filter((user) => user._id);
}

function uniqueNotificationRecipients(users = []) {
  const recipients = new Map();
  users.forEach((user) => {
    if (!user?._id) return;
    recipients.set(String(user._id), user);
  });
  return [...recipients.values()];
}

function isAdminRoleName(roleName) {
  const normalized = String(roleName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return normalized === 'admin' || normalized === 'super admin' || normalized === 'superadmin';
}

function getNotificationEmailSubject(job, clientName, financialYear) {
  const fySuffix = financialYear ? ` (${financialYear})` : '';
  if (job.eventType === 'user_to_manager') return `${job.section.label} review required - ${clientName}${fySuffix}`;
  if (job.eventType === 'manager_to_compliance') return `${job.section.label} compliance review required - ${clientName}${fySuffix}`;
  if (job.eventType === 'manager_to_user') return `${job.section.label} returned by manager - ${clientName}${fySuffix}`;
  if (job.eventType === 'compliance_to_user') return `${job.section.label} returned by compliance - ${clientName}${fySuffix}`;
  if (job.eventType === 'compliance_approved') return `${job.section.label} approved by compliance - ${clientName}${fySuffix}`;
  return `${job.section.label} workflow update - ${clientName}${fySuffix}`;
}

function getNotificationEmailMessage(job, clientName, financialYear, actor, ccpClientId) {
  const actorName = actor?.name || actor?.email || 'A user';
  const action = getNotificationActionConfig(job, actorName);
  const parts = [
    'Compliance System workflow update',
    '',
    action.title,
    action.description,
    '',
    `Tab: ${job.section.label}`,
    `Client: ${clientName}`,
  ];
  if (financialYear) parts.push(`Financial Year: ${financialYear}`);
  if (job.reviewMessage) parts.push('', `Remarks: ${job.reviewMessage}`);
  const actionUrl = getClientActionUrl(ccpClientId);
  if (actionUrl) parts.push('', `Open client workflow: ${actionUrl}`);
  return parts.join('\n');
}

function getNotificationEmailHtml(job, clientName, financialYear, actor, ccpClientId) {
  const actorName = actor?.name || actor?.email || 'A user';
  const action = getNotificationActionConfig(job, actorName);
  const actionUrl = getClientActionUrl(ccpClientId);
  const escapedActionUrl = escapeHtml(actionUrl);
  const remarksHtml = job.reviewMessage
    ? `
      <tr>
        <td style="padding:14px 0 0;">
          <div style="border-left:4px solid ${action.color}; background:#f8fafc; border-radius:12px; padding:14px 16px;">
            <div style="font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.08em;">Remarks</div>
            <div style="margin-top:6px; font-size:14px; line-height:1.6; color:#0f172a;">${escapeHtml(job.reviewMessage)}</div>
          </div>
        </td>
      </tr>`
    : '';

  return `
    <!doctype html>
    <html>
      <body style="margin:0; padding:0; background:#eef2f6; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f6; padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px; background:#ffffff; border:1px solid #dbe3ea; border-radius:18px; overflow:hidden; box-shadow:0 16px 40px rgba(15,23,42,0.08);">
                <tr>
                  <td style="background:#0f766e; padding:22px 26px; color:#ffffff;">
                    <div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.16em; color:#c7f7e8;">Compliance System</div>
                    <div style="margin-top:8px; font-size:22px; line-height:1.3; font-weight:800;">${escapeHtml(action.title)}</div>
                    <div style="margin-top:8px; font-size:14px; line-height:1.6; color:#e6fffb;">${escapeHtml(action.description)}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 26px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom:18px;">
                          <span style="display:inline-block; border-radius:999px; background:${action.bg}; color:${action.color}; border:1px solid ${action.border}; padding:7px 12px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(action.badge)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;">
                            ${getEmailSummaryRow('Client', clientName)}
                            ${getEmailSummaryRow('Tab', job.section.label)}
                            ${financialYear ? getEmailSummaryRow('Financial Year', financialYear) : ''}
                            ${getEmailSummaryRow('Submitted / Action By', actorName)}
                          </table>
                        </td>
                      </tr>
                      ${remarksHtml}
                      ${actionUrl ? `
                        <tr>
                          <td style="padding-top:22px;">
                            <a href="${escapedActionUrl}" style="display:inline-block; background:#0f766e; color:#ffffff; text-decoration:none; border-radius:12px; padding:13px 18px; font-size:14px; font-weight:800;">Open Client Workflow</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:12px; font-size:12px; line-height:1.5; color:#64748b;">
                            If the button does not work, open this link:<br>
                            <a href="${escapedActionUrl}" style="color:#0f766e; word-break:break-all;">${escapedActionUrl}</a>
                          </td>
                        </tr>` : ''}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #e2e8f0; background:#f8fafc; padding:16px 26px; font-size:12px; line-height:1.6; color:#64748b;">
                    This is an automated workflow notification from Compliance System. Please do not reply to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getNotificationActionConfig(job, actorName) {
  const actor = actorName || 'A user';
  if (job.eventType === 'user_to_manager') {
    return {
      title: 'Review required',
      badge: 'Manager action pending',
      description: `${actor} submitted portal data. Please review and take action.`,
      color: '#0f766e',
      bg: '#ccfbf1',
      border: '#99f6e4',
    };
  }
  if (job.eventType === 'manager_to_compliance') {
    return {
      title: 'Compliance review required',
      badge: 'Compliance action pending',
      description: `${actor} approved the data. Compliance review is now required.`,
      color: '#2563eb',
      bg: '#dbeafe',
      border: '#bfdbfe',
    };
  }
  if (job.eventType === 'manager_to_user') {
    return {
      title: 'Data returned by manager',
      badge: 'Revision required',
      description: `${actor} returned the data back to the submitter.`,
      color: '#b45309',
      bg: '#fef3c7',
      border: '#fde68a',
    };
  }
  if (job.eventType === 'compliance_to_user') {
    return {
      title: 'Data returned by compliance',
      badge: 'Revision required',
      description: `${actor} returned the data from compliance review.`,
      color: '#b45309',
      bg: '#fef3c7',
      border: '#fde68a',
    };
  }
  return {
    title: 'Compliance approved',
    badge: 'Approved',
    description: `${actor} approved the data in compliance review.`,
    color: '#15803d',
    bg: '#dcfce7',
    border: '#bbf7d0',
  };
}

function getEmailSummaryRow(label, value) {
  return `
    <tr>
      <td style="width:170px; padding:13px 14px; background:#f8fafc; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(label)}</td>
      <td style="padding:13px 14px; border-bottom:1px solid #e2e8f0; font-size:14px; font-weight:700; color:#0f172a;">${escapeHtml(value || '-')}</td>
    </tr>
  `;
}

function getClientActionUrl(ccpClientId) {
  const baseUrl = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (!baseUrl || !ccpClientId) return '';
  return `${baseUrl}/clients/${encodeURIComponent(ccpClientId)}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
