const inactiveStatuses = new Set(['INACTIVE', 'DISCONTINUED', 'SUSPENDED', 'DELETED']);
const hasFirstAnnualReturnYear = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized || ['-', 'n/a', 'na', 'null', 'undefined'].includes(normalized.toLowerCase())) return false;
  return /^\d{4}\s*[-–—/]\s*\d{2,4}$/.test(normalized);
};

const getCcpConfig = () => {
  const baseUrl = process.env.CCP_API_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    const error = new Error('CCP_API_BASE_URL is not configured');
    error.status = 503;
    throw error;
  }

  return {
    baseUrl,
    apiKey: process.env.CCP_API_KEY,
  };
};

const requestCcp = async (path) => {
  const { baseUrl, apiKey } = getCcpConfig();
  const headers = {};
  if (apiKey) headers['x-ccp-api-key'] = apiKey;

  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = await response.json().catch(() => ({}));

  console.info('[CCP Debug] API response', {
    baseUrl,
    path,
    status: response.status,
    durationMs: Date.now() - startedAt,
    clientCount: Array.isArray(body?.clients) ? body.clients.length : undefined,
    hasClient: Boolean(body?.client),
  });

  if (!response.ok) {
    const error = new Error(body.error || body.message || 'Unable to fetch CCP client data');
    error.status = response.status;
    throw error;
  }

  return body;
};

const businessFieldKeys = [
  'tradeName',
  'clientLegalName',
  'companyIndustry',
  'industry',
  'piboCategory',
  'PIBOCategory',
  'servicesOffered',
  'website',
  'eprCategory',
  'EPRCategory',
];

const normalizeRows = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

const readField = (entry = {}, labels = []) => {
  const list = Array.isArray(entry) ? entry : [entry];
  for (const item of list) {
    const label = String(item?.label || item?.Label || item?.name || item?.Name || '').trim().toLowerCase();
    const value = String(item?.value || item?.Value || '').trim();
    if (!value) continue;
    if (labels.some((candidate) => label === String(candidate).trim().toLowerCase())) return value;
  }
  return '';
};

const parseMsmeStatusValue = (input) => {
  const parts = String(input || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const match = parts.find((part) => {
    const normalized = part.toLowerCase();
    return normalized === 'micro'
      || normalized === 'small'
      || normalized === 'medium'
      || normalized === 'large';
  });

  return match || '';
};

const getMsmeStatus = (client = {}) => {
  const directStatus = getCcpField(client, ['msmeStatus', 'MSMEStatus', 'udyamStatus', 'registrationStatus']);
  if (directStatus) return directStatus;

  const rows = normalizeRows(client?.data?.msmeRows || client?.data?.msme || client?.msmeRows || client?.msme || []);
  const statusLabels = ['MSME Status', 'Status', 'Udyam Status', 'Registration Status'];

  for (const row of rows) {
    const entry = Array.isArray(row) ? row[1] : row;
    const status = readField(entry, statusLabels);
    if (status) return status;

    const parsedStatus = parseMsmeStatusValue(entry?.value || entry?.Value || '');
    if (parsedStatus) return parsedStatus;
  }

  return '';
};

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
);

const mergeCcpRecords = (baseRecord, detailRecord) => {
  if (!isPlainObject(baseRecord)) return detailRecord;
  if (!isPlainObject(detailRecord)) return baseRecord;

  return Object.entries(detailRecord).reduce((merged, [key, value]) => {
    if (isPlainObject(value) && isPlainObject(merged[key])) {
      merged[key] = mergeCcpRecords(merged[key], value);
    } else if (value !== undefined && value !== null && value !== '') {
      merged[key] = value;
    }
    return merged;
  }, { ...baseRecord });
};

const getCcpField = (client, keys) => {
  const keyList = Array.isArray(keys) ? keys : [keys];
  const normalizedKeys = new Set(keyList.map((key) => key.toLowerCase()));
  const visited = new Set();

  const search = (value) => {
    if (!value || typeof value !== 'object' || visited.has(value)) return '';
    visited.add(value);

    for (const [key, entry] of Object.entries(value)) {
      if (normalizedKeys.has(key.toLowerCase()) && entry !== null && entry !== undefined && entry !== '') {
        return entry;
      }
    }

    for (const entry of Object.values(value)) {
      const found = search(entry);
      if (found !== '') return found;
    }

    return '';
  };

  return search(client);
};

const hasBusinessFields = (client) => businessFieldKeys.some((key) => getCcpField(client, key));

const matchesClientId = (client, id) => {
  const possibleIds = [
    client?._id,
    client?.id,
    client?.sourceId,
    client?.data?.basic?.uniqueId,
    client?.data?.basic?.clientCode,
    client?.selectedLead?.leadCode,
  ].filter(Boolean).map(String);

  return possibleIds.includes(String(id));
};

const getOwnerName = (...values) => {
  const match = values.find((value) => {
    if (typeof value === 'string') return value.trim();
    return value?.name && typeof value.name === 'string' && value.name.trim();
  });

  if (typeof match === 'string') return match.trim();
  return match?.name?.trim() || '';
};

export const mapCcpClient = (client, { includeRaw = false } = {}) => {
  const basic = client.data?.basic || {};
  const registeredAddress = client.data?.registeredAddress || {};
  const communicationAddress = client.data?.communicationAddress || {};
  const selectedLead = client.selectedLead || {};
  const visibilityStatus = client.adminControls?.visibilityStatus || 'LIVE';
  const workflowStatus = client.workflowStatus || 'draft';
  const status = inactiveStatuses.has(String(visibilityStatus).toUpperCase())
    ? 'inactive'
    : workflowStatus === 'draft'
      ? 'pending'
      : 'active';

  const email = basic.email || basic.clientEmail || selectedLead.emails?.[0] || '';
  const phone = basic.phone || basic.mobile || selectedLead.mobileNo1 || '';
  const addressParts = [
    registeredAddress.addressLine1 || registeredAddress.address1 || communicationAddress.addressLine1 || communicationAddress.address1 || selectedLead.addressLine1,
    registeredAddress.addressLine2 || registeredAddress.address2 || communicationAddress.addressLine2 || communicationAddress.address2 || selectedLead.addressLine2,
    registeredAddress.addressLine3 || registeredAddress.address3 || communicationAddress.addressLine3 || communicationAddress.address3,
    registeredAddress.city || communicationAddress.city || selectedLead.city,
    registeredAddress.state || communicationAddress.state || selectedLead.state,
    registeredAddress.pinCode || registeredAddress.pincode || communicationAddress.pinCode || communicationAddress.pincode || selectedLead.pinCode,
  ].filter(Boolean);

  const mappedClient = {
    id: client._id,
    sourceId: client._id,
    clientName: getCcpField(client, ['clientLegalName', 'tradeName', 'company']) || 'Unnamed client',
    clientCode: getCcpField(client, ['uniqueId', 'clientCode', 'leadCode']) || client._id,
    tradeName: getCcpField(client, 'tradeName'),
    clientLegalName: getCcpField(client, 'clientLegalName'),
    companyIndustry: getCcpField(client, ['companyIndustry', 'industry']),
    piboCategory: getCcpField(client, ['piboCategory', 'PIBOCategory']),
    servicesOffered: getCcpField(client, 'servicesOffered'),
    website: getCcpField(client, 'website'),
    eprCategory: getCcpField(client, ['eprCategory', 'EPRCategory']),
    onboardingYear: getCcpField(client, 'onboardingYear'),
    firstAnnualReturnYear: getCcpField(client, 'firstAnnualReturnYear'),
    msmeStatus: getMsmeStatus(client),
    assignedToName: getOwnerName(
      client.data?.importMeta?.assignedTo,
      client.adminControls?.assignedTo,
      client.adminControls?.assignedToText,
      client.adminControls?.assignedToName,
      client.assignedTo,
      client.assignedToText,
      client.assignedToName,
    ),
    createdByName: getOwnerName(
      client.data?.importMeta?.createdBy,
      client.createdBy,
      client.createdByText,
      client.createdByName,
    ),
    email,
    phone,
    address: addressParts.join(', '),
    status,
    ccpVisibilityStatus: visibilityStatus,
    workflowStatus,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };

  if (includeRaw) {
    const existingData = isPlainObject(client.data) ? client.data : {};
    const existingBasic = isPlainObject(existingData.basic) ? existingData.basic : {};
    mappedClient.ccpData = {
      ...client,
      data: {
        ...existingData,
        basic: {
          ...existingBasic,
          tradeName: existingBasic.tradeName || mappedClient.tradeName,
          clientLegalName: existingBasic.clientLegalName || mappedClient.clientLegalName,
          companyIndustry: existingBasic.companyIndustry || mappedClient.companyIndustry,
          piboCategory: existingBasic.piboCategory || mappedClient.piboCategory,
          servicesOffered: existingBasic.servicesOffered || mappedClient.servicesOffered,
          website: existingBasic.website || mappedClient.website,
          eprCategory: existingBasic.eprCategory || mappedClient.eprCategory,
          onboardingYear: existingBasic.onboardingYear || mappedClient.onboardingYear,
          firstAnnualReturnYear: existingBasic.firstAnnualReturnYear || mappedClient.firstAnnualReturnYear,
        },
      },
    };
  }

  return mappedClient;
};

export const fetchCcpClients = async ({ activeOnly = true } = {}) => {
  const body = await requestCcp('/clients');
  const clients = Array.isArray(body.clients) ? body.clients.map(mapCcpClient) : [];
  const filteredClients = activeOnly ? clients.filter((client) => client.status !== 'inactive') : clients;

  console.info('[CCP Debug] Client mapping summary', {
    source: process.env.CCP_API_BASE_URL?.replace(/\/$/, ''),
    receivedCount: clients.length,
    returnedCount: filteredClients.length,
    activeOnly,
    withFirstAnnualReturnYear: filteredClients.filter((client) => hasFirstAnnualReturnYear(client.firstAnnualReturnYear)).length,
    withoutFirstAnnualReturnYear: filteredClients.filter((client) => !hasFirstAnnualReturnYear(client.firstAnnualReturnYear)).length,
  });

  return filteredClients;
};

export const fetchCcpClientById = async (id) => {
  let body;
  try {
    body = await requestCcp(`/clients/${encodeURIComponent(id)}`);
  } catch (error) {
    // Some CCP records are returned by the client-list endpoint before they are
    // available from /clients/:id. Keep those records usable in the PO flow.
    if (error.status !== 404) throw error;
    body = {};
  }

  let client = body.client || null;

  if (!client || !hasBusinessFields(client)) {
    const listBody = await requestCcp('/clients');
    const listClient = Array.isArray(listBody.clients)
      ? listBody.clients.find((item) => matchesClientId(item, id))
      : null;

    if (listClient) client = client ? mergeCcpRecords(listClient, client) : listClient;
  }

  if (!client) return null;
  return mapCcpClient(client, { includeRaw: true });
};
