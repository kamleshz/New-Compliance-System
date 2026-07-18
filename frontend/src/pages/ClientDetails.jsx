import { Fragment, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  FiArrowLeft as ArrowLeft,
  FiBriefcase as Building2,
  FiCheckCircle as BadgeCheck,
  FiChevronDown as ChevronDown,
  FiClock as CalendarClock,
  FiExternalLink as ExternalLink,
  FiFileText as FileText,
  FiGlobe as Globe,
  FiHash as Hash,
  FiImage as ImagePlus,
  FiMapPin as MapPin,
  FiPhone as Phone,
  FiPlus as Plus,
  FiRefreshCw as RefreshCw,
  FiAlertOctagon as ServerCrash,
  FiShield as ShieldCheck,
  FiTrash2 as Trash2,
  FiUser as UserRound,
  FiX as X,
} from 'react-icons/fi';
import api from '../services/api.js';
import EprTargetCalculationPanel from '../components/EprTargetCalculationPanel.jsx';
import { AuthContext } from '../context/AuthContext.jsx';

const statusOptions = ['', 'Complete', 'pending', 'Partailly Complete'];
const FINANCIAL_YEAR_OPTIONS = [
  '2022-23',
  '2023-24',
  '2024-25',
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30',
];
const purchaseRemarkOptions = [
  'Client revised the data',
  'Uploaded Wrong enrty',
  'additional data uploaded',
  'Manager reject the data',
];
const purchaseProgressParticulars = [
  'Received from client',
  'Partially Data received',
  'Complete Data Received',
  'Work In Process',
  'Ready to upload',
  'Partially Complete',
  'Nil Upload',
  'Client Approval on data',
  'Upload Complete',
];
const emptyPortalUploadSection = () => ({
  baseData: {},
  portalUpload: {},
  images: [],
  progressRows: [],
  startDate: '',
  endDate: '',
  remarks: [],
  revisedStartDate: '',
  revisedEndDate: '',
  managerVerificationStatus: '',
  managerReview: '',
  managerReviewThread: [],
  eprCreditSummary: {},
  managerVerifiedAt: '',
  managerVerifiedBy: '',
  complianceVerificationStatus: '',
  complianceReview: '',
  complianceReviewThread: [],
  complianceVerifiedAt: '',
  complianceVerifiedBy: '',
});

const emptyPortalDataUpload = () => ({
  purchase: emptyPortalUploadSection(),
  sales: emptyPortalUploadSection(),
  prePost: emptyPortalUploadSection(),
  eprTarget: emptyPortalUploadSection(),
  eprCredit: emptyPortalUploadSection(),
  gst: emptyPortalUploadSection(),
  reusePlan: emptyPortalUploadSection(),
  allScreenshots: emptyPortalUploadSection(),
  preConsumer: emptyPortalUploadSection(),
  state: emptyPortalUploadSection(),
  annualConsumption: emptyPortalUploadSection(),
});

const normalizePortalDataUpload = (upload = {}) => ({
  ...emptyPortalDataUpload(),
  ...(upload || {}),
});

const screenshotUploadGroups = [
  { key: 'homePageTargetFiles', title: 'Home Page Target', description: 'Upload home page target screenshots.' },
  { key: 'walletFiles', title: 'Wallet', description: 'Upload wallet screenshots.' },
  { key: 'creditTransferFiles', title: 'Credit Transfer', description: 'Upload credit transfer screenshots.' },
  { key: 'stateWiseCurrentYearFiles', title: 'State Wise For Current Year', description: 'Upload current year state-wise screenshots.' },
  { key: 'annualConsumptionFiles', title: 'Annual Consumption', description: 'Upload annual consumption screenshots.' },
  { key: 'annualFilingBeforeFiles', title: 'Annual Filing Before Submitting', description: 'Upload annual filing before submitting screenshots.' },
  { key: 'annualFilingAfterFiles', title: 'Annual Filing After Submitting', description: 'Upload annual filing after submitting screenshots.' },
];

const sectionConfig = [
  ['basic', 'Basic', Building2],
  ['registeredAddress', 'Registered Address', MapPin],
  ['communicationAddress', 'Communication Address', MapPin],
  ['compliance', 'Compliance', ShieldCheck],
  ['msmeRows', 'MSME', FileText],
  ['cte', 'CTE', FileText],
  ['cteProductionRows', 'CTE Production', FileText],
  ['ctoProductRows', 'CTO Products', FileText],
  ['cpcb', 'CPCB', BadgeCheck],
  ['validation', 'Validation', FileText],
  ['otp', 'OTP', Phone],
  ['authorised', 'Authorised Person', UserRound],
  ['coordinating', 'Coordinating Person', UserRound],
  ['importMeta', 'Import Meta', Hash],
];

function getCurrentFinancialYear(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return FINANCIAL_YEAR_OPTIONS.at(0);
  const year = date.getFullYear();
  const isAfterMarch = date.getMonth() >= 3;
  const startYear = isAfterMarch ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYearShort}`;
}

function getNextFinancialYear(financialYear) {
  const normalized = normalizeFinancialYear(financialYear);
  const [startYear] = normalized.split('-');
  const nextStartYear = Number(startYear) + 1;
  const nextEndYear = String((nextStartYear + 1) % 100).padStart(2, '0');
  return `${nextStartYear}-${nextEndYear}`;
}

function parseFinancialYear(financialYear) {
  const rawValue = String(financialYear || '').trim();
  const yearMatch = rawValue.match(/(20\d{2})\s*[-/]\s*(\d{2,4})/);
  const normalized = yearMatch ? `${yearMatch[1]}-${yearMatch[2].slice(-2)}` : rawValue;
  return FINANCIAL_YEAR_OPTIONS.includes(normalized) ? normalized : '';
}

function normalizeFinancialYear(financialYear) {
  const normalized = parseFinancialYear(financialYear);
  if (normalized) return normalized;
  const fallback = getCurrentFinancialYear();
  return FINANCIAL_YEAR_OPTIONS.includes(fallback) ? fallback : FINANCIAL_YEAR_OPTIONS.at(0);
}

function createDefaultComplianceRows() {
  return complianceStatusRows.map((label, index) => ({
    sr: index + 1,
    complianceStatus: label,
    startDate: '',
    endDate: '',
    status: '',
    userRemarks: [],
    managerRemarks: [],
    complianceRemarks: [],
  }));
}

function getFinancialYearSummary(rows, financialYear) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const hasContent = normalizedRows.some((row) => (
    row?.status
    || row?.startDate
    || row?.endDate
    || normalizeRemarks(row?.userRemarks).length
    || normalizeRemarks(row?.managerRemarks).length
    || normalizeRemarks(row?.complianceRemarks).length
  ));
  const allCompleted = normalizedRows.length > 0 && normalizedRows.every((row) => row?.status === 'Complete');

  let status = 'Not Started';
  if (allCompleted) status = 'Completed';
  else if (hasContent) status = 'In Progress';

  return {
    financialYear,
    exists: normalizedRows.length > 0,
    rowCount: normalizedRows.length,
    status,
  };
}

function ClientDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeInfoTab, setActiveInfoTab] = useState('basic');
  const [financialYear, setFinancialYear] = useState(() => normalizeFinancialYear(getCurrentFinancialYear()));
  const [complianceRows, setComplianceRows] = useState([]);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [portalAsset, setPortalAsset] = useState({ email: '', images: [] });
  const [savingPortalAsset, setSavingPortalAsset] = useState(false);
  const [activePortalDataTab, setActivePortalDataTab] = useState('purchase');
  const [portalDataUpload, setPortalDataUpload] = useState(emptyPortalDataUpload());
  const [savingPortalData, setSavingPortalData] = useState(false);
  const [fyRecords, setFyRecords] = useState({ compliance: true, portalAsset: true, portalData: true });
  const currentFinancialYear = useMemo(() => normalizeFinancialYear(getCurrentFinancialYear()), []);
  const [showFinancialYearSelector, setShowFinancialYearSelector] = useState(() => Boolean(location.state?.openFinancialYearSelector));
  const [pendingFinancialYear, setPendingFinancialYear] = useState(() => parseFinancialYear(location.state?.financialYear || ''));
  const [financialYearSummaries, setFinancialYearSummaries] = useState([]);
  const [loadingFinancialYearSummaries, setLoadingFinancialYearSummaries] = useState(false);
  const [startingFinancialYear, setStartingFinancialYear] = useState(false);
  const [purchaseOrderFinancialYears, setPurchaseOrderFinancialYears] = useState(() => {
    const years = Array.isArray(location.state?.poFinancialYears) ? location.state.poFinancialYears : [];
    return years.map((year) => parseFinancialYear(year)).filter(Boolean);
  });
  const nextFinancialYear = useMemo(() => getNextFinancialYear(currentFinancialYear), [currentFinancialYear]);
  const availableFinancialYears = useMemo(() => {
    const preferredYears = purchaseOrderFinancialYears.length ? purchaseOrderFinancialYears : FINANCIAL_YEAR_OPTIONS;
    return [...new Set(preferredYears.map((year) => parseFinancialYear(year)).filter(Boolean))];
  }, [purchaseOrderFinancialYears]);

  useEffect(() => {
    fetchClient();
    fetchPurchaseOrder();
  }, [id]);

  useEffect(() => {
    fetchComplianceStatus();
    fetchPortalAsset();
    fetchPortalDataUpload();
  }, [id, financialYear]);

  useEffect(() => {
    if (!showFinancialYearSelector) return;
    setPendingFinancialYear('');
    loadFinancialYearSummaries();
  }, [showFinancialYearSelector, financialYear, purchaseOrderFinancialYears.join('|')]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ccp-clients/${id}`, { params: { t: Date.now() } });
      setClient(response.data.client || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch client details from CCP.');
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrder = async () => {
    try {
      const response = await api.get(`/client-purchase-orders/${encodeURIComponent(id)}`);
      const poRows = Array.isArray(response.data?.purchaseOrder?.poYearRecords) ? response.data.purchaseOrder.poYearRecords : [];
      const years = poRows
        .map((row) => parseFinancialYear(row?.fyYear))
        .filter(Boolean);
      setPurchaseOrderFinancialYears(years);
    } catch (err) {
      setPurchaseOrderFinancialYears(Array.isArray(location.state?.poFinancialYears)
        ? location.state.poFinancialYears.map((year) => parseFinancialYear(year)).filter(Boolean)
        : []);
    }
  };

  const fetchComplianceStatus = async () => {
    try {
      const response = await api.get(`/client-compliance-status/${encodeURIComponent(id)}`, {
        params: { financialYear },
      });
      setComplianceRows(response.data.rows || []);
      setError('');
      setFyRecords((current) => ({ ...current, compliance: response.data.exists !== false }));
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('');
        setComplianceRows(createDefaultComplianceRows());
        setFyRecords((current) => ({ ...current, compliance: false }));
        return;
      }
      setError(err.response?.data?.message || 'Unable to fetch compliance status.');
      setComplianceRows(createDefaultComplianceRows());
      setFyRecords((current) => ({ ...current, compliance: false }));
    }
  };

  const loadFinancialYearSummaries = async () => {
    setLoadingFinancialYearSummaries(true);
    try {
      const summaries = await Promise.all(
        availableFinancialYears.map(async (year) => {
          try {
            const response = await api.get(`/client-compliance-status/${encodeURIComponent(id)}`, {
              params: { financialYear: year },
            });
            const summary = getFinancialYearSummary(response.data.rows || [], year);
            return response.data.exists === false ? { ...summary, exists: false } : summary;
          } catch (err) {
            if (err.response?.status === 404) {
              return getFinancialYearSummary([], year);
            }
            return {
              financialYear: year,
              exists: false,
              rowCount: 0,
              status: 'Unavailable',
            };
          }
        }),
      );
      setFinancialYearSummaries(summaries);
    } finally {
      setLoadingFinancialYearSummaries(false);
    }
  };

  const saveComplianceRows = async (rows, targetFinancialYear = financialYear) => {
    setSavingCompliance(true);
    try {
      const response = await api.put(`/client-compliance-status/${encodeURIComponent(id)}`, { financialYear: targetFinancialYear, rows });
      setComplianceRows(response.data.rows || rows);
      setError('');
      setFyRecords((current) => ({ ...current, compliance: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save compliance status.');
    } finally {
      setSavingCompliance(false);
    }
  };

  const updateComplianceRow = (sr, field, nextValue) => {
    const nextRows = complianceRows.map((row) => (
      row.sr === sr ? { ...row, [field]: nextValue } : row
    ));
    setComplianceRows(nextRows);
    saveComplianceRows(nextRows);
  };

  const fetchPortalAsset = async () => {
    try {
      const response = await api.get(`/client-portal-assets/${encodeURIComponent(id)}`, {
        params: { financialYear },
      });
      setPortalAsset(response.data.portalAsset || { email: '', images: [] });
      setError('');
      setFyRecords((current) => ({ ...current, portalAsset: response.data.exists !== false }));
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('');
        setPortalAsset({ email: '', images: [] });
        setFyRecords((current) => ({ ...current, portalAsset: false }));
        return;
      }
      setError(err.response?.data?.message || 'Unable to fetch portal images and email.');
      setPortalAsset({ email: '', images: [] });
      setFyRecords((current) => ({ ...current, portalAsset: false }));
    }
  };

  const savePortalAsset = async (nextAsset, targetFinancialYear = financialYear) => {
    setSavingPortalAsset(true);
    try {
      const response = await api.put(`/client-portal-assets/${encodeURIComponent(id)}`, { financialYear: targetFinancialYear, ...nextAsset });
      setPortalAsset(response.data.portalAsset || nextAsset);
      setError('');
      setFyRecords((current) => ({ ...current, portalAsset: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save portal images and email.');
    } finally {
      setSavingPortalAsset(false);
    }
  };

  const updatePortalEmail = (email) => {
    const nextAsset = { ...portalAsset, email };
    setPortalAsset(nextAsset);
    savePortalAsset(nextAsset);
  };

  const uploadPortalImages = async (files) => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const images = await Promise.all(selectedFiles.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));

    const nextAsset = { ...portalAsset, images: [...(portalAsset.images || []), ...images] };
    setPortalAsset(nextAsset);
    savePortalAsset(nextAsset);
  };

  const removePortalImage = (imageIndex) => {
    const nextAsset = {
      ...portalAsset,
      images: (portalAsset.images || []).filter((_, index) => index !== imageIndex),
    };
    setPortalAsset(nextAsset);
    savePortalAsset(nextAsset);
  };

  const fetchPortalDataUpload = async () => {
    try {
      const response = await api.get(`/client-portal-data-uploads/${encodeURIComponent(id)}`, {
        params: { financialYear },
      });
      setPortalDataUpload(normalizePortalDataUpload(response.data.portalDataUpload));
      setError('');
      setFyRecords((current) => ({ ...current, portalData: response.data.exists !== false }));
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError('');
        setPortalDataUpload(emptyPortalDataUpload());
        setFyRecords((current) => ({ ...current, portalData: false }));
        return;
      }
      setError(err.response?.data?.message || 'Unable to fetch portal data uploads.');
      setPortalDataUpload(emptyPortalDataUpload());
      setFyRecords((current) => ({ ...current, portalData: false }));
    }
  };

  const savePortalDataUpload = async (nextUpload, targetFinancialYear = financialYear) => {
    setSavingPortalData(true);
    try {
      const response = await api.put(`/client-portal-data-uploads/${encodeURIComponent(id)}`, { financialYear: targetFinancialYear, ...nextUpload });
      setPortalDataUpload(normalizePortalDataUpload(response.data.portalDataUpload || nextUpload));
      setError('');
      setFyRecords((current) => ({ ...current, portalData: true }));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save portal data upload.');
    } finally {
      setSavingPortalData(false);
    }
  };

  const uploadPortalDataExcel = async (section, field, file) => {
    if (!file) return;
    const uploadedFile = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result;
          const base64 = String(dataUrl).split(',')[1] || '';
          const workbook = XLSX.read(base64, { type: 'base64' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
          resolve({ name: file.name, dataUrl, rows, uploadedAt: new Date().toISOString() });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const currentSection = portalDataUpload[section] || {};
    const nextSection = {
      ...currentSection,
      [field]: uploadedFile,
    };

    if (section === 'eprCredit' && field === 'baseData') {
      nextSection.eprCreditSummary = buildEprCreditSummary(uploadedFile.rows || []);
    }

    if (
      (['purchase', 'sales'].includes(section) && hasUploadedFile(nextSection.baseData) && hasUploadedFile(nextSection.portalUpload))
      || (section === 'eprCredit' && hasUploadedFile(nextSection.baseData))
    ) {
      nextSection.managerVerificationStatus = 'Pending';
      nextSection.managerVerifiedAt = '';
      nextSection.managerVerifiedBy = '';
      nextSection.complianceVerificationStatus = '';
      nextSection.complianceVerifiedAt = '';
      nextSection.complianceVerifiedBy = '';
    }

    const nextUpload = {
      ...portalDataUpload,
      [section]: nextSection,
    };
    setPortalDataUpload(nextUpload);
    savePortalDataUpload(nextUpload);
  };

  const removePortalDataExcel = (section, field) => {
    const nextSection = {
      ...(portalDataUpload[section] || {}),
      [field]: {},
    };
    if (section === 'eprCredit' && field === 'baseData') {
      nextSection.eprCreditSummary = {};
      nextSection.managerVerificationStatus = '';
      nextSection.managerVerifiedAt = '';
      nextSection.managerVerifiedBy = '';
      nextSection.complianceVerificationStatus = '';
      nextSection.complianceVerifiedAt = '';
      nextSection.complianceVerifiedBy = '';
    }

    const nextUpload = {
      ...portalDataUpload,
      [section]: nextSection,
    };
    setPortalDataUpload(nextUpload);
    savePortalDataUpload(nextUpload);
  };

  const uploadPortalDataImages = async (section, files, field = 'images') => {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;

    const images = await Promise.all(selectedFiles.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));

    const nextUpload = {
      ...portalDataUpload,
      [section]: {
        ...(portalDataUpload[section] || {}),
        [field]: [...(portalDataUpload[section]?.[field] || []), ...images],
      },
    };
    setPortalDataUpload(nextUpload);
    savePortalDataUpload(nextUpload);
  };

  const removePortalDataImage = (section, imageIndex, field = 'images') => {
    const nextUpload = {
      ...portalDataUpload,
      [section]: {
        ...(portalDataUpload[section] || {}),
        [field]: (portalDataUpload[section]?.[field] || []).filter((_, index) => index !== imageIndex),
      },
    };
    setPortalDataUpload(nextUpload);
    savePortalDataUpload(nextUpload);
  };

  const updatePortalDataMeta = (section, field, nextValue) => {
    updatePortalDataSectionMeta(section, { [field]: nextValue });
  };

  const updatePortalDataSectionMeta = (section, nextFields) => {
    const nextUpload = {
      ...portalDataUpload,
      [section]: {
        ...(portalDataUpload[section] || {}),
        ...nextFields,
      },
    };
    setPortalDataUpload(nextUpload);
    savePortalDataUpload(nextUpload);
  };

  const raw = client?.ccpData || {};
  const data = raw?.data || {};
  const showSalesUpload = canShowSalesUpload(data?.basic?.piboCategory);
  const clientName = value(data?.basic?.clientLegalName || data?.basic?.tradeName || client?.clientName);
  const msmeStatus = getMsmeStatus(data);
  const companyBasicInfo = [
    ['Trade Name', data?.basic?.tradeName],
    ['Client Legal Name', data?.basic?.clientLegalName],
    ['Company Industry', data?.basic?.companyIndustry],
    ['PIBO Category', data?.basic?.piboCategory],
    ['Services Offered', data?.basic?.servicesOffered],
    ['Website', data?.basic?.website],
    ['EPR Category', data?.basic?.eprCategory],
    ['Onboarding Year', data?.basic?.onboardingYear || client?.onboardingYear],
    ['First Annual Return Year', data?.basic?.firstAnnualReturnYear || client?.firstAnnualReturnYear],
    ['Client Code', client?.clientCode],
  ];
  const companyInfo = [
    ['GST No.', data?.compliance?.gst],
    ['GST Date', data?.compliance?.gstDate],
    ['CIN', data?.compliance?.cin],
    ['CIN Date', data?.compliance?.cinDate],
    ['PAN', data?.compliance?.pan],
    ['PAN Date', data?.compliance?.panDate],
    ['Factory License', data?.compliance?.factoryLicense],
    ['Factory License Date', data?.compliance?.factoryLicenseDate],
    ['EPR Certificate', data?.compliance?.eprCertificate],
    ['CPCB Registration', data?.cpcb?.registrationNumber],
    ['CPCB Status', data?.cpcb?.status],
    ['Authorised Person', data?.authorised?.name],
    ['Authorised Email', data?.authorised?.email || client?.email],
    ['Authorised Mobile', data?.authorised?.mobile || client?.phone],
    ['Coordinating Person', data?.coordinating?.name],
    ['Coordinating Email', data?.coordinating?.email],
  ];
  const infoTabs = [
    {
      id: 'basic',
      label: 'Company Basic Info',
      title: 'Basic',
      subtitle: 'Core identity and business classification',
      icon: Building2,
      rows: companyBasicInfo,
    },
    {
      id: 'companyCompliance',
      label: 'Company Compliance',
      title: 'Company Compliance',
      subtitle: 'Company compliance data and purchase uploads',
      icon: BadgeCheck,
      type: 'companyCompliance',
    },
  ];

  const financialYearLabel = financialYear === currentFinancialYear ? `${financialYear} · Active` : `${financialYear} · Viewing`;
  const needsFinancialYearStart = !fyRecords.compliance || !fyRecords.portalAsset || !fyRecords.portalData;
  const selectedFinancialYearSummary = financialYearSummaries.find((summary) => summary.financialYear === pendingFinancialYear);
  const previousFinancialYearSummaries = financialYearSummaries
    .filter((summary) => summary.exists && summary.financialYear !== currentFinancialYear && summary.financialYear !== nextFinancialYear)
    .sort((left, right) => right.financialYear.localeCompare(left.financialYear));

  const startFinancialYear = async (targetFinancialYear = financialYear) => {
    setStartingFinancialYear(true);
    const nextComplianceRows = createDefaultComplianceRows();
    const emptyAsset = { email: '', images: [] };
    const emptyUpload = emptyPortalDataUpload();
    setFinancialYear(targetFinancialYear);
    setComplianceRows(nextComplianceRows);
    setPortalAsset(emptyAsset);
    setPortalDataUpload(emptyUpload);
    setFyRecords({ compliance: true, portalAsset: true, portalData: true });
    try {
      await saveComplianceRows(nextComplianceRows, targetFinancialYear);
      await savePortalAsset(emptyAsset, targetFinancialYear);
      await savePortalDataUpload(emptyUpload, targetFinancialYear);
      await loadFinancialYearSummaries();
    } finally {
      setStartingFinancialYear(false);
    }
  };

  const continueWithFinancialYear = async () => {
    if (!pendingFinancialYear) return;
    if (selectedFinancialYearSummary?.exists) {
      setFinancialYear(pendingFinancialYear);
      setShowFinancialYearSelector(false);
      return;
    }

    setShowFinancialYearSelector(false);
    await startFinancialYear(pendingFinancialYear);
  };

  return (
    <div className="min-h-full bg-[#f3f6f8] p-4 sm:p-6">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
          <div className="bg-white px-5 py-5 text-slate-900 sm:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black leading-tight tracking-normal text-slate-950 sm:text-[28px]">
                  {loading ? 'Loading client...' : clientName}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold">
                    <Hash className="h-4 w-4 text-slate-400" />
                    <span>{value(client?.clientCode)}</span>
                  </span>
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 font-semibold">
                    <CalendarClock className="h-4 w-4 text-slate-400" />
                    <span>Updated {formatDate(client?.updatedAt || client?.createdAt)}</span>
                  </span>
                  <HeaderStatusPill label="MSME Status" value={msmeStatus} />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                <div className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/50">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">FY</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    financialYear === currentFinancialYear ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                  }`}>
                    {financialYearLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFinancialYearSelector(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Change FY
                </button>
                <button type="button" onClick={fetchClient} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm shadow-slate-200/50 transition hover:border-slate-300 hover:bg-slate-50">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
                <Link to="/clients" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#0f766e] px-4 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-[#115e59]">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error ? <ErrorState message={error} onRetry={fetchClient} /> : null}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500 shadow-sm">
            Loading complete client profile...
          </div>
        ) : client ? (
          <>
            <section>
              <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#0f766e] shadow-sm shadow-slate-200/60">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black text-slate-950">Company Snapshot</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Key client identity details at a glance.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <SnapshotBadge label="PIBO" value={data?.basic?.piboCategory} />
                    <SnapshotBadge label="EPR" value={data?.basic?.eprCategory} />
                  </div>
                </div>
                <div className="grid gap-x-8 gap-y-2 p-5 md:grid-cols-2 xl:grid-cols-3">
                  <Detail icon={<Building2 className="h-4 w-4" />} label="Trade Name" value={data?.basic?.tradeName} />
                  <Detail icon={<Building2 className="h-4 w-4" />} label="Legal Name" value={data?.basic?.clientLegalName} />
                  <Detail icon={<FileText className="h-4 w-4" />} label="Industry" value={data?.basic?.companyIndustry} />
                  <Detail icon={<Hash className="h-4 w-4" />} label="PIBO Category" value={data?.basic?.piboCategory} />
                  <Detail icon={<ShieldCheck className="h-4 w-4" />} label="EPR Category" value={data?.basic?.eprCategory} />
                  <Detail icon={<Globe className="h-4 w-4" />} label="Website" value={data?.basic?.website} link />
                </div>
              </article>
            </section>

            {needsFinancialYearStart ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Financial Year Setup</p>
                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">No record found for FY {financialYear}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Start this financial year to track compliance, uploads, and approvals, or open the FY selector to switch to an older record.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFinancialYearSelector(true)}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open FY Selector
                    </button>
                    <button
                      type="button"
                      onClick={() => startFinancialYear(financialYear)}
                      disabled={startingFinancialYear}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0f766e] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {startingFinancialYear ? 'Starting…' : `Start FY ${financialYear}`}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <InfoTabSwitcher tabs={infoTabs} activeTab={activeInfoTab} onChange={setActiveInfoTab} />

            {activeInfoTab === 'company' ? (
              <ComplianceStatusTable
                rows={complianceRows}
                saving={savingCompliance}
                onComplianceChange={updateComplianceRow}
              />
            ) : activeInfoTab === 'companyCompliance' ? (
              <CompanyCompliancePanel
                ccpClientId={id}
                activeTab={activePortalDataTab}
                onTabChange={setActivePortalDataTab}
                upload={portalDataUpload}
                saving={savingPortalData}
                user={user}
                piboCategory={data?.basic?.piboCategory}
                onUploadPortalDataExcel={uploadPortalDataExcel}
                onRemovePortalDataExcel={removePortalDataExcel}
                onUploadPortalDataImages={uploadPortalDataImages}
                onRemovePortalDataImage={removePortalDataImage}
                onUpdatePortalDataMeta={updatePortalDataMeta}
                onUpdatePortalDataSectionMeta={updatePortalDataSectionMeta}
                onNilUploadYes={() => setActivePortalDataTab('allScreenshots')}
              />
            ) : (
              <CompanyBasicOverview data={data} client={client} />
            )}
          </>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Building2 className="h-8 w-8 text-slate-400" />
            <h2 className="mt-4 text-base font-semibold text-slate-950">Client not found</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">CCP returned no record for this client.</p>
          </div>
        )}

        <FinancialYearSelectorModal
          open={showFinancialYearSelector}
          selectedFinancialYear={pendingFinancialYear}
          summaries={financialYearSummaries}
          previousSummaries={previousFinancialYearSummaries}
          loading={loadingFinancialYearSummaries}
          busy={startingFinancialYear}
          onClose={() => setShowFinancialYearSelector(false)}
          onSelect={setPendingFinancialYear}
          onConfirm={continueWithFinancialYear}
        />
      </div>
    </div>
  );
}

function FinancialYearSelectorModal({
  open,
  selectedFinancialYear,
  summaries,
  loading,
  busy,
  onClose,
  onSelect,
  onConfirm,
}) {
  if (!open) return null;

  const orderedSummaries = [...summaries].sort((left, right) => right.financialYear.localeCompare(left.financialYear));
  const existingYears = orderedSummaries.filter((summary) => summary.exists);
  const availableYears = orderedSummaries.filter((summary) => !summary.exists);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Compliance Financial Year</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">Select The Year To Work On</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Choose any financial year you want to open. Existing years will load their saved data, and new years can be started when selected.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close financial year selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              Loading available financial years...
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Available Years</p>
                    <h4 className="mt-1 text-lg font-extrabold text-slate-950">Open Any Existing Compliance Year</h4>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    Saved years open with their existing compliance data and uploads.
                  </p>
                </div>

                {existingYears.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {existingYears.map((summary) => (
                      <FinancialYearCard
                        key={summary.financialYear}
                        summary={summary}
                        selectedFinancialYear={selectedFinancialYear}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    No saved compliance years were found for this client yet.
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Start New Year</p>
                    <h4 className="mt-1 text-lg font-extrabold text-slate-950">Choose A Year To Start Fresh</h4>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    These years do not have saved compliance records yet.
                  </p>
                </div>

                {availableYears.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {availableYears.map((summary) => (
                      <FinancialYearCard
                        key={summary.financialYear}
                        summary={summary}
                        selectedFinancialYear={selectedFinancialYear}
                        selected={selectedFinancialYear === summary.financialYear}
                        onSelect={onSelect}
                        compact
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    All configured financial years already have records.
                  </div>
                )}
              </section>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading || busy || !selectedFinancialYear}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0f766e] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? 'Processing…' : 'Open Selected FY'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialYearCard({
  summary,
  selectedFinancialYear,
  selected,
  onSelect,
  compact = false,
}) {
  const toneClass = summary.status === 'Completed'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
    : summary.status === 'In Progress'
      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  const description = summary.exists
    ? 'Open this year to review, continue, or update saved compliance records.'
    : 'Select this year to create a fresh compliance cycle and start entering data.';

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.financialYear)}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        (selected || selectedFinancialYear === summary.financialYear)
          ? 'border-slate-300 bg-slate-50 shadow-sm ring-2 ring-slate-200'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className={`flex ${compact ? 'items-start justify-between gap-3' : 'flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Financial Year</p>
            {(selected || selectedFinancialYear === summary.financialYear) ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200">
                Selected
              </span>
            ) : null}
          </div>
          <h5 className="mt-2 text-lg font-extrabold text-slate-950">{summary.financialYear}</h5>
          <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${toneClass}`}>
            {summary.status}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {summary.exists ? `${summary.rowCount} compliance rows saved` : 'No saved record yet'}
          </span>
        </div>
      </div>
    </button>
  );
}

function InfoTabSwitcher({ tabs, activeTab, onChange }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/50">
      <div className="grid gap-2 sm:grid-cols-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold transition ${
                active
                  ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                active ? 'bg-white text-[#0f766e] shadow-sm ring-1 ring-slate-200' : 'bg-slate-100 text-slate-500'
              }`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{tab.label}</span>
                <span className={`mt-0.5 block truncate text-xs font-semibold ${
                  active ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {tab.subtitle}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CompanyBasicOverview({ data, client }) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const basic = data?.basic || {};
  const authorised = data?.authorised || {};
  const coordinating = data?.coordinating || {};
  const clientDisplayName = basic.clientLegalName || basic.clientName || client?.clientName;
  const groupName = basic.companyGroupName || basic.clientLegalName || client?.companyGroupName;
  const entityType = basic.entityType || basic.piboCategory;
  const detailSections = sectionConfig
    .filter(([key]) => key !== 'basic')
    .map(([key, title, Icon]) => ({
      key,
      title,
      Icon,
      value: data?.[key],
    }));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-950">Overview</h3>
            <p className="text-sm font-semibold text-slate-500">Primary company identity and contacts.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen((current) => !current)}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? 'Collapse' : 'Expand'}
          <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="space-y-6 px-5 py-5">
        <OverviewGroup title="Company Overview" columns="lg:grid-cols-2">
          <OverviewField label="Client Name" value={clientDisplayName} />
          <OverviewField label="Trade Name" value={basic.tradeName} />
          <OverviewField label="Company Group Name" value={groupName} />
          <OverviewField label="Entity Type" value={entityType} />
          <OverviewField label="Onboarding Year" value={basic.onboardingYear || client?.onboardingYear} />
          <OverviewField label="First Annual Return Year" value={basic.firstAnnualReturnYear || client?.firstAnnualReturnYear} />
        </OverviewGroup>

        <OverviewGroup title="Authorised Person Details" columns="lg:grid-cols-3">
          <OverviewField label="Name" value={authorised.name} />
          <OverviewField label="Contact Number" value={authorised.mobile || authorised.number || client?.phone} />
          <OverviewField label="Email" value={authorised.email || client?.email} />
        </OverviewGroup>

        <OverviewGroup title="Coordinating Person Details" columns="lg:grid-cols-3">
          <OverviewField label="Name" value={coordinating.name} />
          <OverviewField label="Contact Number" value={coordinating.mobile || coordinating.number || coordinating.phone} />
          <OverviewField label="Email" value={coordinating.email} />
        </OverviewGroup>

        {detailsOpen ? (
          <div className="mt-7 border-t border-slate-200 pt-5">
            <div className="mb-5">
              <h3 className="text-sm font-extrabold text-slate-950">Complete Client Master Data</h3>
              <p className="text-xs font-semibold text-slate-500">All remaining CCP sections are shown below.</p>
            </div>
            <div className="grid gap-5">
              {detailSections.map((section) => (
                <GroupedDataBlock key={section.key} section={section} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function OverviewGroup({ title, columns, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{title}</h4>
      <div className={`grid gap-x-8 gap-y-0 ${columns}`}>
        {children}
      </div>
    </section>
  );
}

function OverviewField({ label, value: entry }) {
  return (
    <div className="grid gap-1 py-3 md:grid-cols-[140px_minmax(0,1fr)] md:gap-4">
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="break-words text-sm font-semibold text-slate-950">
        <SmartValue value={entry} />
      </div>
    </div>
  );
}

function BasicDataAccordion({ sections, activeInfo, open, onToggle }) {
  const recordCount = sections.reduce((total, section) => total + normalizeRows(section.value).length, activeInfo.rows.length);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 transition hover:border-slate-300">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left transition hover:bg-slate-50"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-950">Company Basic Info</h3>
            <p className="text-xs font-semibold text-slate-500">{recordCount ? `${recordCount} total records` : 'No data'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 sm:inline-flex">
            {open ? 'Collapse' : 'Expand'}
          </span>
          <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open ? (
        <div className="border-t border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-4">
            <InfoTable
              title={activeInfo.title}
              subtitle={activeInfo.subtitle}
              icon={activeInfo.icon}
              rows={activeInfo.rows}
            />
            <div className="flex items-center justify-between gap-3 pt-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-950">Complete Client Master Data</h4>
                <p className="text-xs font-semibold text-slate-500">All remaining CCP sections are shown below in the same Basic tab.</p>
              </div>
            </div>
            {sections.map((section) => (
              <GroupedDataBlock key={section.key} section={section} />
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-100 px-5 py-3 text-xs font-semibold text-slate-500">
          {recordCount ? 'Click to view all client details' : 'No data available'}
        </div>
      )}
    </article>
  );
}

const complianceStatusRows = [
  'Purchase data upload',
  'Sales data upload With all invoices',
  'Pre Consumer upload',
  'Statewise upload',
  'Annual Consumption upload',
  'Cat I Subcategory qutnity to be checked',
  'Export data received and upload',
  'EPR Credit received in wallet',
  'EPR Credit transfer to Annual filing tab (All remarks to be closed)',
  'GST 1 and GST2A Upload (In case of Importer)',
  'Reuse plan upload (Incase Of BrandOwner',
  'Take All Screenshots (Home page target, Wallet,Credit transfer, State wise for current year, Annual consumption, Annual filing page before submitting and after submitting)',
  'Additional Remarks',
];

function InfoTable({ title, subtitle, icon: Icon, rows, type, saving, onComplianceChange }) {
  if (type === 'complianceStatus') {
    return <ComplianceStatusTable rows={rows} saving={saving} onComplianceChange={onComplianceChange} />;
  }

  const isBasicInline = title === 'Basic' && Array.isArray(rows) && rows.every((row) => Array.isArray(row) && row.length === 2);
  const iconMap = {
    'Trade Name': Building2,
    'Client Legal Name': Building2,
    'Company Industry': FileText,
    'PIBO Category': Hash,
    'Services Offered': BadgeCheck,
    Website: Globe,
  };

  if (isBasicInline) {
    return (
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
        <div className="flex items-center gap-3 bg-white px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
            <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="grid gap-x-10 gap-y-2 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(([label, entry]) => {
            const RowIcon = iconMap[label] || Icon;
            const isWebsite = String(label).toLowerCase() === 'website';
            return (
              <div key={label} className="grid min-w-0 gap-1 py-3 md:grid-cols-[140px_minmax(0,1fr)] md:gap-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <span className="text-slate-400"><RowIcon className="h-4 w-4" /></span>
                  {label}:
                </p>
                <div className="break-words text-sm font-semibold leading-6 text-slate-950">
                  {isWebsite && entry && entry !== 'N/A' ? <ExternalValue value={entry} /> : <SmartValue value={entry} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
          <p className="text-xs font-semibold text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map(([label, entry]) => (
              <tr key={label} className="transition hover:bg-slate-50">
                <th className="w-[42%] px-4 py-3 align-top text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </th>
                <td className="px-4 py-3 align-top font-bold text-slate-900">
                  <SmartValue value={entry} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComplianceStatusTable({ rows, saving, onComplianceChange }) {
  const [remarksModal, setRemarksModal] = useState(null);

  const openRemarksModal = (row, field, label) => {
    setRemarksModal({
      sr: row.sr,
      title: `${label} - ${row.complianceStatus}`,
      field,
      remarks: normalizeRemarks(row[field]),
    });
  };

  const closeRemarksModal = () => setRemarksModal(null);

  const saveRemarks = (remarks) => {
    if (!remarksModal) return;
    onComplianceChange(remarksModal.sr, remarksModal.field, normalizeRemarks(remarks));
    closeRemarksModal();
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1440px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="w-14 border border-slate-300 px-3 py-2 text-center font-extrabold">SR</th>
              <th className="border border-slate-300 px-3 py-2 text-center font-extrabold">Compliance Status</th>
              <th className="w-44 border border-slate-300 px-3 py-2 text-center font-extrabold">Start Date</th>
              <th className="w-44 border border-slate-300 px-3 py-2 text-center font-extrabold">End Date</th>
              <th className="w-56 border border-slate-300 px-3 py-2 text-center font-extrabold">Status</th>
              <th className="w-56 border border-slate-300 px-3 py-2 text-center font-extrabold">User Remarks</th>
              <th className="w-56 border border-slate-300 px-3 py-2 text-center font-extrabold">Manager Remarks</th>
              <th className="w-56 border border-slate-300 px-3 py-2 text-center font-extrabold">Compliance Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sr} className="bg-white align-top transition hover:bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-900">{row.sr}</td>
                <td className="border border-slate-300 px-3 py-2 font-extrabold text-slate-950">{row.complianceStatus}</td>
                <td className="border border-slate-300 px-3 py-2">
                  <input
                    type="date"
                    value={row.startDate || ''}
                    onChange={(event) => onComplianceChange(row.sr, 'startDate', event.target.value)}
                    disabled={saving}
                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  <input
                    type="date"
                    value={row.endDate || ''}
                    onChange={(event) => onComplianceChange(row.sr, 'endDate', event.target.value)}
                    disabled={saving}
                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </td>
                <td className="border border-slate-300 px-3 py-2">
                  <select
                    value={row.status || ''}
                    onChange={(event) => onComplianceChange(row.sr, 'status', event.target.value)}
                    disabled={saving}
                    className={`min-h-10 w-full rounded-lg border px-3 text-sm font-extrabold outline-none transition focus:ring-4 ${
                      row.status === 'Complete'
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-800 focus:ring-emerald-100'
                        : row.status === 'pending'
                          ? 'border-red-200 bg-red-50 text-red-800 focus:ring-red-100'
                          : row.status === 'Partailly Complete'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 focus:ring-amber-100'
                            : 'border-slate-200 bg-white text-slate-700 focus:ring-slate-100'
                    }`}
                  >
                    {statusOptions.map((option) => (
                      <option key={option || 'blank'} value={option}>
                        {option || 'Select status'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">
                  <RemarksCell
                    value={row.userRemarks}
                    disabled={saving}
                    onOpen={() => openRemarksModal(row, 'userRemarks', 'User Remarks')}
                  />
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">
                  <RemarksCell
                    value={row.managerRemarks}
                    disabled={saving}
                    onOpen={() => openRemarksModal(row, 'managerRemarks', 'Manager Remarks')}
                  />
                </td>
                <td className="border border-slate-300 px-3 py-2 text-slate-700">
                  <RemarksCell
                    value={row.complianceRemarks}
                    disabled={saving}
                    onOpen={() => openRemarksModal(row, 'complianceRemarks', 'Compliance Remarks')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {remarksModal ? (
        <RemarksModal
          title={remarksModal.title}
          remarks={remarksModal.remarks}
          saving={saving}
          onClose={closeRemarksModal}
          onSave={saveRemarks}
        />
      ) : null}
    </section>
  );
}

function RemarksCell({ value, disabled, onOpen }) {
  const remarks = normalizeRemarks(value);
  const preview = remarks[0] || 'Add remarks';

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className="flex min-h-12 w-full flex-col items-start justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
        {remarks.length ? `${remarks.length} point${remarks.length === 1 ? '' : 's'}` : 'No points'}
      </span>
      <span className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{preview}</span>
    </button>
  );
}

function RemarksModal({ title, remarks, saving, onClose, onSave }) {
  const [draft, setDraft] = useState(() => {
    const normalized = normalizeRemarks(remarks);
    return normalized.length ? normalized : [''];
  });

  useEffect(() => {
    const normalized = normalizeRemarks(remarks);
    setDraft(normalized.length ? normalized : ['']);
  }, [remarks]);

  const updatePoint = (index, value) => {
    setDraft((current) => current.map((point, pointIndex) => (
      pointIndex === index ? value : point
    )));
  };

  const addPoint = () => setDraft((current) => [...current, '']);

  const removePoint = (index) => {
    setDraft((current) => {
      const next = current.filter((_, pointIndex) => pointIndex !== index);
      return next.length ? next : [''];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#ACC0D3] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#ACC0D3] bg-[linear-gradient(135deg,#EEF4F8_0%,#F5F9FC_100%)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#30525C]">Point-wise remarks</p>
            <h3 className="mt-1 break-words text-lg font-extrabold text-slate-950">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            aria-label="Close remarks"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          {draft.map((point, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[2rem_1fr_auto] sm:items-start">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-extrabold text-slate-700">
                {index + 1}
              </span>
              <textarea
                value={point}
                onChange={(event) => updatePoint(index, event.target.value)}
                rows={3}
                placeholder="Write remark point"
                className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-950"
              />
              <button
                type="button"
                onClick={() => removePoint(index)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
                aria-label={`Remove remark point ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addPoint}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-[#ACC0D3] bg-[#EEF4F8] px-4 text-sm font-extrabold text-[#30525C] transition hover:bg-[#E3EDF4]"
          >
            <Plus className="h-4 w-4" />
            Add point
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="admin-secondary-button justify-center">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="admin-primary-button justify-center disabled:cursor-wait disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save remarks'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortalAssetsPanel({ asset, saving, onSaveEmail, onUploadImages, onRemoveImage }) {
  const [emailDraft, setEmailDraft] = useState(asset?.email || '');
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    setEmailDraft(asset?.email || '');
  }, [asset?.email]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Portal Email</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                disabled={saving}
                placeholder="Enter portal email"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={() => onSaveEmail(emailDraft)}
                disabled={saving}
                className="admin-primary-button justify-center"
              >
                Save Email
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Saved email: {asset?.email || '-'}
            </p>
          </div>

          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-6 text-center transition hover:bg-emerald-50">
            <ImagePlus className="h-9 w-9 text-emerald-700" />
            <span className="mt-3 text-sm font-extrabold text-slate-950">Bulk upload portal images</span>
            <span className="mt-1 text-xs font-semibold text-slate-500">Select multiple PNG, JPG, JPEG screenshots at once</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                onUploadImages(event.target.files);
                event.target.value = '';
              }}
              disabled={saving}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-950">Uploaded Images</h4>
              <p className="text-xs font-semibold text-slate-500">{asset?.images?.length || 0} images saved</p>
            </div>
            {saving ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Saving...</span> : null}
          </div>

          {asset?.images?.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {asset.images.map((image, index) => (
                <article key={`${image.name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button type="button" onClick={() => setPreviewFile(image)} className="block aspect-video w-full bg-slate-100">
                    <img src={image.dataUrl} alt={image.name} className="h-full w-full object-cover" />
                  </button>
                  <div className="space-y-3 p-3">
                    <p className="truncate text-sm font-extrabold text-slate-950">{image.name}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setPreviewFile(image)} className="admin-secondary-button min-h-9 flex-1 justify-center px-3 text-xs">
                        Open
                      </button>
                      <button type="button" onClick={() => onRemoveImage(index)} disabled={saving} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500">
              No portal images uploaded yet.
            </div>
          )}
        </div>
      </div>
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}

function CompanyCompliancePanel({
  ccpClientId,
  activeTab,
  onTabChange,
  upload,
  saving,
  user,
  piboCategory,
  onUploadPortalDataExcel,
  onRemovePortalDataExcel,
  onUploadPortalDataImages,
  onRemovePortalDataImage,
  onUpdatePortalDataMeta,
  onUpdatePortalDataSectionMeta,
  onNilUploadYes,
}) {
  const showSalesTab = canShowSalesUpload(piboCategory);
  const showGstTab = canShowGstUpload(piboCategory);
  const showReusePlanTab = canShowReusePlanUpload(piboCategory);
  const tabs = [
    { id: 'purchase', label: 'Purchase Data', icon: FileText },
    ...(showSalesTab ? [{ id: 'sales', label: 'Sales Data', icon: FileText }] : []),
    { id: 'preConsumerStateAnnual', label: 'Pre Consumer / State / Annual', icon: FileText },
    { id: 'eprTarget', label: 'EPR Target', icon: ShieldCheck },
    { id: 'eprCredit', label: 'EPR CREDIT', icon: ShieldCheck },
    ...(showGstTab ? [{ id: 'gst', label: 'GST', icon: FileText }] : []),
    ...(showReusePlanTab ? [{ id: 'reusePlan', label: 'Reuse Plan', icon: FileText }] : []),
    { id: 'allScreenshots', label: 'Upload All Screenshot', icon: ImagePlus },
  ];
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'purchase';
  const excelReadOnly = canOnlyDownloadPortalExcel(user);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#f3f6f8] p-1.5">
        <div className="inline-flex min-w-full flex-nowrap gap-1">
          {tabs.map((tab) => {
            const active = selectedTab === tab.id;
            const complianceApproved = upload?.[tab.id]?.complianceVerificationStatus === 'Approved';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex min-h-11 min-w-[160px] flex-1 shrink-0 items-center justify-center gap-2 rounded-lg border px-4 text-center text-sm font-extrabold whitespace-nowrap transition ${
                  complianceApproved
                    ? active
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800 shadow-sm'
                      : 'border-transparent bg-emerald-50 text-emerald-700 hover:border-emerald-100 hover:bg-emerald-100'
                    : active
                      ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                      : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-[#0f766e]'
                }`}
              >
                {complianceApproved ? <BadgeCheck className="h-4 w-4" /> : null}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTab === 'purchase' ? (
        <PurchaseDataUploadContent
          upload={upload}
          saving={saving}
          user={user}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          onUpdatePortalDataMeta={onUpdatePortalDataMeta}
          onUpdatePortalDataSectionMeta={onUpdatePortalDataSectionMeta}
          onNilUploadYes={onNilUploadYes}
          showStatusRow
          excelReadOnly={excelReadOnly}
        />
      ) : null}

      {selectedTab === 'sales' ? (
        <SalesDataUploadContent
          upload={upload}
          saving={saving}
          user={user}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          onUpdatePortalDataMeta={onUpdatePortalDataMeta}
          onUpdatePortalDataSectionMeta={onUpdatePortalDataSectionMeta}
          onNilUploadYes={onNilUploadYes}
          showStatusRow
          excelReadOnly={excelReadOnly}
        />
      ) : null}

      {selectedTab === 'preConsumerStateAnnual' ? (
        <PortalDataUploadSection
          title="Pre/Post Data Upload"
          description="Upload purchase portal data and pre/post consumer Excel data."
          baseTitle="Purchase Portal Upload"
          baseDescription="Upload the purchase portal Excel file."
          portalTitle="Pre/Post Upload"
          portalDescription="Upload the pre consumer, post consumer, and export Excel file."
          section="prePost"
          upload={upload?.prePost}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          excelReadOnly={excelReadOnly}
          beforeContent={(
            <PurchaseDataStatusTable
              purchase={upload?.prePost}
              sectionKey="prePost"
              itemTitle="Pre consumer / state / annual consumption upload"
              drawerTitle="Pre consumer / state / annual consumption upload"
              saving={saving}
              user={user}
              onUpdate={(field, value) => onUpdatePortalDataMeta('prePost', field, value)}
              onUpdateDetails={(nextFields) => onUpdatePortalDataSectionMeta('prePost', nextFields)}
              onUploadImages={onUploadPortalDataImages}
              onRemoveImage={onRemovePortalDataImage}
            />
          )}
        >
          <PrePostSummaryTable
            purchaseRows={upload?.prePost?.baseData?.rows || []}
            prePostRows={upload?.prePost?.portalUpload?.rows || []}
          />
          <StateWisePrePostTable prePostRows={upload?.prePost?.portalUpload?.rows || []} />
          <AnnualReturnTable prePostRows={upload?.prePost?.portalUpload?.rows || []} />
          <EprTargetCalculationPanel ccpClientId={ccpClientId} entityType="brandOwner" />
        </PortalDataUploadSection>
      ) : null}

      {selectedTab === 'eprTarget' ? (
        <PortalDataUploadSection
          title="EPR Target Upload"
          description="Upload EPR target data and portal target reference files."
          baseTitle="EPR Target Data"
          baseDescription="Upload the EPR target Excel file."
          portalTitle="EPR Target Portal Upload"
          portalDescription="Upload the EPR target portal Excel file."
          section="eprTarget"
          upload={upload?.eprTarget}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          excelReadOnly={excelReadOnly}
        >
          <EprTargetCalculationPanel ccpClientId={ccpClientId} entityType="producer" />
        </PortalDataUploadSection>
      ) : null}

      {selectedTab === 'eprCredit' ? (
        <PortalDataUploadSection
          title="EPR Credit Upload"
          description="Upload the EPR credit Excel file."
          baseTitle="EPR Credit Data"
          baseDescription="Upload the base EPR credit Excel file."
          section="eprCredit"
          upload={upload?.eprCredit}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          excelReadOnly={excelReadOnly}
          showPortalUpload={false}
          beforeContent={(
            <PurchaseDataStatusTable
              purchase={upload?.eprCredit}
              sectionKey="eprCredit"
              itemTitle="EPR credit upload"
              drawerTitle="EPR credit upload"
              saving={saving}
              user={user}
              requirePortalUpload={false}
              startDateLabel="Excel upload date"
              startDateHelp="Auto-filled when the EPR credit Excel is uploaded."
              onUpdate={(field, value) => onUpdatePortalDataMeta('eprCredit', field, value)}
              onUpdateDetails={(nextFields) => onUpdatePortalDataSectionMeta('eprCredit', nextFields)}
              onUploadImages={onUploadPortalDataImages}
              onRemoveImage={onRemovePortalDataImage}
            />
          )}
        >
          <EprCreditSummaryTable
            rows={upload?.eprCredit?.baseData?.rows || []}
            savedSummary={upload?.eprCredit?.eprCreditSummary}
          />
        </PortalDataUploadSection>
      ) : null}

      {selectedTab === 'gst' ? (
        <DocumentOnlyComplianceSection
          title="GST Documents"
          description="Only upload GST 1A and GST 2A documents here."
          upload={upload?.gst}
          saving={saving}
          sectionKey="gst"
          onUploadImages={onUploadPortalDataImages}
          onRemoveImage={onRemovePortalDataImage}
          groups={[
            { key: 'gst1aFiles', title: 'Upload GST 1A', description: 'Upload GST 1A images or PDF files.' },
            { key: 'gst2aFiles', title: 'Upload GST 2A', description: 'Upload GST 2A images or PDF files.' },
          ]}
        />
      ) : null}

      {selectedTab === 'reusePlan' ? (
        <DocumentOnlyComplianceSection
          title="Reuse Plan Documents"
          description="Only upload reuse plan documents here."
          upload={upload?.reusePlan}
          saving={saving}
          sectionKey="reusePlan"
          onUploadImages={onUploadPortalDataImages}
          onRemoveImage={onRemovePortalDataImage}
          groups={[
            { key: 'reusePlanFiles', title: 'Upload Reuse Plan', description: 'Upload reuse plan images or PDF files.' },
          ]}
        />
      ) : null}

      {selectedTab === 'allScreenshots' ? (
        <DocumentOnlyComplianceSection
          title="Upload All Screenshot"
          description="Upload all required portal screenshots section by section."
          upload={upload?.allScreenshots}
          saving={saving}
          sectionKey="allScreenshots"
          onUploadImages={onUploadPortalDataImages}
          onRemoveImage={onRemovePortalDataImage}
          groups={screenshotUploadGroups}
          columnsClass="lg:grid-cols-2 2xl:grid-cols-3"
        />
      ) : null}
    </section>
  );
}

function DocumentOnlyComplianceSection({
  title,
  description,
  upload,
  saving,
  sectionKey,
  groups,
  onUploadImages,
  onRemoveImage,
  columnsClass = 'xl:grid-cols-2',
}) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
        <p className="text-xs font-semibold text-slate-500">{description}</p>
      </div>
      <div className={`mt-5 grid gap-4 ${columnsClass}`}>
        {groups.map((group) => (
          <DocumentUploadBox
            key={group.key}
            title={group.title}
            description={group.description}
            files={upload?.[group.key] || []}
            saving={saving}
            onUpload={(files) => onUploadImages?.(sectionKey, files, group.key)}
            onRemove={(index) => onRemoveImage?.(sectionKey, index, group.key)}
          />
        ))}
      </div>
    </div>
  );
}

function FilePreviewModal({ file, onClose }) {
  const previewUrl = useObjectUrlFromDataUrl(file?.dataUrl);
  const fileName = file?.name || 'Uploaded file';
  const mimeType = getFileMimeType(file);
  const fileTypeLabel = getPreviewFileTypeLabel(file);
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isMail = isMailFile(file);

  useEffect(() => {
    if (!file) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [file, onClose]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close preview" onClick={onClose} />
      <section className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.6)]">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50/70 px-5 py-4">
          <div className="flex min-h-14 items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                  Preview
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                  {fileTypeLabel}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold text-slate-950">{fileName}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Review the uploaded file inside the app, or open/download it separately when needed.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {isMail ? (
                <span className="inline-flex min-h-9 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                  Mail Viewer
                </span>
              ) : null}
              {previewUrl ? (
                <>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                  <a
                    href={previewUrl}
                    download={fileName}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Download
                  </a>
                </>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-[55vh] overflow-auto bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 p-5">
          {previewUrl && isImage ? (
            <img src={previewUrl} alt={fileName} className="mx-auto max-h-[72vh] max-w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm" />
          ) : previewUrl && isPdf ? (
            <iframe title={fileName} src={previewUrl} className="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm" />
          ) : isMail ? (
            <MailPreviewContent file={file} />
          ) : (
            <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-bold text-slate-700">Preview is not available for this file.</p>
              <p className="mt-1 max-w-md text-xs font-medium leading-6 text-slate-500">Use Open or Download to view it outside the app.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MailPreviewContent({ file }) {
  const [state, setState] = useState({
    loading: true,
    error: '',
    mail: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadMailPreview = async () => {
      if (!file?.dataUrl) {
        setState({ loading: false, error: 'Mail preview is not available for this file.', mail: null });
        return;
      }

      setState({ loading: true, error: '', mail: null });
      try {
        const mail = await parseMailFile(file);
        if (!cancelled) {
          setState({ loading: false, error: '', mail });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || 'Unable to parse this mail file inside the app.',
            mail: null,
          });
        }
      }
    };

    loadMailPreview();
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (state.loading) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <FileText className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700">Loading mail preview...</p>
        <p className="mt-1 max-w-md text-xs font-medium leading-6 text-slate-500">Parsing sender details, recipients, attachments, and message body.</p>
      </div>
    );
  }

  if (state.error || !state.mail) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <FileText className="h-7 w-7 text-slate-400" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-700">Preview is not available for this mail.</p>
        <p className="mt-1 max-w-xl text-xs font-medium leading-6 text-slate-500">{state.error || 'Use Open or Download to view it outside the app.'}</p>
      </div>
    );
  }

  const { mail } = state;
  const hasHtml = Boolean(mail.html?.trim());
  const hasText = Boolean(mail.text?.trim());
  const attachmentCount = Array.isArray(mail.attachments) ? mail.attachments.length : 0;
  const bodyTypeLabel = hasHtml ? 'HTML body' : hasText ? 'Text body' : 'No body';

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-[0_20px_45px_-32px_rgba(15,118,110,0.4)]">
        <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white px-5 py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Mail Summary</p>
              <h4 className="mt-2 break-words text-lg font-extrabold text-slate-950">{mail.subject || file?.name || 'Untitled mail'}</h4>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {attachmentCount ? `${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''} included in this mail.` : 'No attachments were found in this mail.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MailInfoPill>{bodyTypeLabel}</MailInfoPill>
              <MailInfoPill>{attachmentCount ? `${attachmentCount} file(s)` : 'No attachments'}</MailInfoPill>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            <MailMetaField label="Subject" value={mail.subject || '-'} emphasis />
            <MailMetaField label="Date" value={mail.date || '-'} />
          </div>

          <section className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Attachments</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {attachmentCount ? `${attachmentCount} file(s)` : 'No attachments'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
            </div>

            <div className="mt-4">
              {attachmentCount ? (
                <div className="flex max-h-[220px] flex-wrap gap-2 overflow-auto pr-1">
                  {mail.attachments.map((attachment, index) => (
                    <span
                      key={`${attachment}-${index}`}
                      className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm"
                    >
                      <span className="truncate">{attachment}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-medium text-slate-500">
                  No attachment files were found in this mail.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Message Body</p>
              <p className="mt-1 text-sm font-medium text-slate-500">A cleaner in-app view of the uploaded email content.</p>
            </div>
            <MailInfoPill>{bodyTypeLabel}</MailInfoPill>
          </div>
        </div>
        <div className="p-5">
          {hasHtml ? (
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-inner shadow-slate-100">
              <iframe
                title={`${file?.name || 'mail'} preview`}
                sandbox=""
                srcDoc={mail.html}
                className="h-[56vh] w-full bg-white"
              />
            </div>
          ) : hasText ? (
            <pre className="max-h-[56vh] overflow-auto whitespace-pre-wrap break-words rounded-[22px] border border-slate-200 bg-slate-50/70 p-5 text-[15px] font-medium leading-8 text-slate-700 shadow-inner shadow-slate-100">
              {mail.text}
            </pre>
          ) : (
            <div className="flex min-h-[24vh] items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-500">No readable message body was found in this mail.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MailMetaField({ label, value, emphasis = false }) {
  return (
    <div className={`rounded-[20px] border px-4 py-4 shadow-sm ${emphasis ? 'border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white' : 'border-slate-200 bg-white'}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-all text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function MailInfoPill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
      {children}
    </span>
  );
}

function useObjectUrlFromDataUrl(dataUrl) {
  const [objectUrl, setObjectUrl] = useState('');

  useEffect(() => {
    if (!dataUrl) {
      setObjectUrl('');
      return undefined;
    }

    try {
      const [meta, base64 = ''] = String(dataUrl).split(',');
      const mimeMatch = meta.match(/^data:([^;]+);base64$/);
      if (!mimeMatch || !base64) {
        setObjectUrl(dataUrl);
        return undefined;
      }

      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const nextUrl = URL.createObjectURL(new Blob([bytes], { type: mimeMatch[1] }));
      setObjectUrl(nextUrl);
      return () => URL.revokeObjectURL(nextUrl);
    } catch {
      setObjectUrl(dataUrl);
      return undefined;
    }
  }, [dataUrl]);

  return objectUrl;
}

function getFileMimeType(file = {}) {
  const dataUrlMatch = String(file?.dataUrl || '').match(/^data:([^;]+);/);
  if (dataUrlMatch?.[1]) return dataUrlMatch[1];

  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.eml')) return 'message/rfc822';
  if (name.endsWith('.msg')) return 'application/vnd.ms-outlook';
  return '';
}

function getPreviewFileTypeLabel(file = {}) {
  const name = String(file?.name || '').toLowerCase();
  const mimeType = getFileMimeType(file);
  if (name.endsWith('.msg')) return 'Outlook Mail (.msg)';
  if (name.endsWith('.eml')) return 'Email Message (.eml)';
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType.startsWith('image/')) return 'Image File';
  return mimeType || 'Uploaded Document';
}

function isMailFile(file = {}) {
  const name = String(file?.name || '').toLowerCase();
  const mimeType = getFileMimeType(file);
  return (
    name.endsWith('.eml')
    || name.endsWith('.msg')
    || mimeType === 'message/rfc822'
    || mimeType === 'application/vnd.ms-outlook'
  );
}

async function parseMailFile(file = {}) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.msg')) {
    return parseMsgMailFile(file);
  }
  return parseEmlMailFile(file);
}

async function parseEmlMailFile(file = {}) {
  const arrayBuffer = await dataUrlToArrayBuffer(file?.dataUrl);
  const PostalMime = await loadPostalMime();
  const email = await PostalMime.parse(arrayBuffer, { attachmentEncoding: 'arraybuffer' });

  return {
    subject: email?.subject || '',
    from: formatMailboxList(email?.from),
    to: formatMailboxList(email?.to),
    cc: formatMailboxList(email?.cc),
    date: formatMailDate(email?.date),
    html: typeof email?.html === 'string' ? email.html : '',
    text: email?.text || '',
    attachments: Array.isArray(email?.attachments)
      ? email.attachments.map((attachment, index) => attachment?.filename || `Attachment ${index + 1}`)
      : [],
  };
}

async function parseMsgMailFile(file = {}) {
  const arrayBuffer = await dataUrlToArrayBuffer(file?.dataUrl);
  const MsgReader = await loadMsgReader();
  const message = new MsgReader(arrayBuffer).getFileData();

  return {
    subject: message?.subject || '',
    from: formatAddressLine(message?.senderName, message?.senderEmail),
    to: formatRecipients(message?.recipients),
    cc: '',
    date: formatMailDate(message?.messageDeliveryTime || message?.clientSubmitTime),
    html: message?.bodyHtml || '',
    text: message?.body || '',
    attachments: Array.isArray(message?.attachments)
      ? message.attachments.map((attachment, index) => attachment?.fileName || attachment?.name || `Attachment ${index + 1}`)
      : [],
  };
}

async function dataUrlToArrayBuffer(dataUrl) {
  if (!dataUrl) throw new Error('Missing uploaded file content.');
  const response = await fetch(String(dataUrl));
  if (!response.ok) throw new Error('Unable to read uploaded file content.');
  return response.arrayBuffer();
}

async function loadPostalMime() {
  const module = await import('postal-mime');
  return module.default;
}

async function loadMsgReader() {
  const module = await import('@kenjiuno/msgreader');
  return module.default;
}

function formatMailboxList(value) {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map((entry) => formatMailboxList(entry)).filter(Boolean).join(', ');
  }
  if (typeof value === 'string') return value;
  if (value.address || value.name) return formatAddressLine(value.name, value.address);
  if (Array.isArray(value.group)) {
    return value.group.map((entry) => formatMailboxList(entry)).filter(Boolean).join(', ');
  }
  return '';
}

function formatRecipients(recipients) {
  if (!Array.isArray(recipients)) return '';
  return recipients
    .map((recipient) => formatAddressLine(recipient?.name, recipient?.email || recipient?.smtpAddress))
    .filter(Boolean)
    .join(', ');
}

function formatAddressLine(name, email) {
  if (name && email) return `${name} <${email}>`;
  return name || email || '';
}

function formatMailDate(value) {
  if (!value) return '';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return String(value);
  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DocumentUploadBox({ title, description, files, saving, onUpload, onRemove }) {
  const fileCount = files?.length || 0;
  const [previewFile, setPreviewFile] = useState(null);

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-extrabold text-slate-950">{title}</h5>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {fileCount ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 ring-1 ring-slate-200">
              {fileCount} file{fileCount > 1 ? 's' : ''}
            </span>
          ) : null}
          {saving ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Saving...</span> : null}
        </div>
      </div>

      <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-[#f8fafc] p-5 text-center transition hover:border-slate-400 hover:bg-slate-50">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
          <ImagePlus className="h-6 w-6" />
        </span>
        <span className="mt-3 text-sm font-extrabold text-slate-950">Click To Upload</span>
        <span className="mt-1 text-xs font-semibold text-slate-500">PNG, JPG, JPEG, PDF supported</span>
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          multiple
          className="hidden"
          disabled={saving}
          onChange={(event) => {
            onUpload(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      <p className="mt-2 text-center text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{title}</p>

      {files?.length ? (
        <div className="mt-4 grid gap-2">
          {files.map((file, index) => (
            <div key={`${file.name || 'file'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPreviewFile(file)}
                disabled={!file?.dataUrl}
                className="min-w-0 flex-1 truncate text-sm font-bold text-emerald-700 transition hover:text-emerald-800 hover:underline"
              >
                {file.name || `File ${index + 1}`}
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={saving}
                className="inline-flex min-h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">No files uploaded yet.</p>
      )}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}

function PortalDataUploadPanel({
  ccpClientId,
  activeTab,
  onTabChange,
  upload,
  saving,
  user,
  showSalesUpload,
  onUploadPortalDataExcel,
  onRemovePortalDataExcel,
  onUploadPortalDataImages,
  onRemovePortalDataImage,
  onUpdatePortalDataMeta,
  onUpdatePortalDataSectionMeta,
}) {
  const tabs = [
    { id: 'purchase', label: 'Purchase', icon: FileText },
    ...(showSalesUpload ? [{ id: 'sales', label: 'Sales', icon: FileText }] : []),
    { id: 'prePost', label: 'Pre/Post Data', icon: FileText },
    { id: 'eprTarget', label: 'EPR Target', icon: ShieldCheck },
  ];
  const selectedTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'purchase';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#f3f6f8] p-1.5">
        <div className="inline-flex min-w-full flex-nowrap gap-1">
          {tabs.map((tab) => {
            const active = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`min-h-11 min-w-[150px] flex-1 shrink-0 rounded-lg border px-4 text-center text-sm font-extrabold whitespace-nowrap transition ${
                  active
                    ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                    : 'border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-[#0f766e]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedTab === 'purchase' ? (
        <PurchaseDataUploadContent
          upload={upload}
          saving={saving}
          user={user}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          onUpdatePortalDataMeta={onUpdatePortalDataMeta}
          onUpdatePortalDataSectionMeta={onUpdatePortalDataSectionMeta}
          excelReadOnly={excelReadOnly}
        />
      ) : null}

      {selectedTab === 'sales' ? (
        <PortalDataUploadSection
          title="Sales Data Upload"
          description="Upload Excel files for sales base data and sales portal upload."
          baseTitle="Sales Base Data"
          baseDescription="Upload the base sales Excel file."
          portalTitle="Sales Portal Upload"
          portalDescription="Upload the final portal sales Excel file."
          section="sales"
          upload={upload?.sales}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          onUploadPortalDataImages={onUploadPortalDataImages}
          onRemovePortalDataImage={onRemovePortalDataImage}
          excelReadOnly={excelReadOnly}
        >
          <>
            <PurchaseSummaryTable
              title="Sales Upload Summary"
              caption="Data to be upload = Sales Base Data / Quantity (TPA). Uploaded on portal = Sales Portal Upload / Total Plastic Qty (Tons)."
              baseRows={upload?.sales?.baseData?.rows || []}
              portalRows={upload?.sales?.portalUpload?.rows || []}
              requireCompletedPortalRows
              enableMaterialDrilldown
            />
            <EntitySummaryTables
              title="Sales Upload Summary By Entity"
              caption="Grouped by Name of Entity from both sales Excel sheets."
              baseRows={upload?.sales?.baseData?.rows || []}
              portalRows={upload?.sales?.portalUpload?.rows || []}
              requireCompletedPortalRows
            />
          </>
        </PortalDataUploadSection>
      ) : null}

      {selectedTab === 'prePost' ? (
        <PortalDataUploadSection
          title="Pre/Post Data Upload"
          description="Upload purchase portal data and pre/post consumer Excel data."
          baseTitle="Purchase Portal Upload"
          baseDescription="Upload the purchase portal Excel file."
          portalTitle="Pre/Post Upload"
          portalDescription="Upload the pre consumer, post consumer, and export Excel file."
          section="prePost"
          upload={upload?.prePost}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          excelReadOnly={excelReadOnly}
        >
          <PrePostSummaryTable
            purchaseRows={upload?.prePost?.baseData?.rows || []}
            prePostRows={upload?.prePost?.portalUpload?.rows || []}
          />
          <EprTargetCalculationPanel ccpClientId={ccpClientId} entityType="brandOwner" />
        </PortalDataUploadSection>
      ) : null}

      {selectedTab === 'eprTarget' ? (
        <PortalDataUploadSection
          title="EPR Target Upload"
          description="Upload EPR target data and portal target reference files."
          baseTitle="EPR Target Data"
          baseDescription="Upload the EPR target Excel file."
          portalTitle="EPR Target Portal Upload"
          portalDescription="Upload the EPR target portal Excel file."
          section="eprTarget"
          upload={upload?.eprTarget}
          saving={saving}
          onUploadPortalDataExcel={onUploadPortalDataExcel}
          onRemovePortalDataExcel={onRemovePortalDataExcel}
          excelReadOnly={excelReadOnly}
        >
          <EprTargetCalculationPanel ccpClientId={ccpClientId} entityType="producer" />
        </PortalDataUploadSection>
      ) : null}
    </section>
  );
}

function PurchaseDataUploadContent({
  upload,
  saving,
  user,
  onUploadPortalDataExcel,
  onRemovePortalDataExcel,
  onUploadPortalDataImages,
  onRemovePortalDataImage,
  onUpdatePortalDataMeta,
  onUpdatePortalDataSectionMeta,
  showStatusRow = false,
  excelReadOnly = false,
  onNilUploadYes,
}) {
  const uploadUnlocked = isPurchaseUploadUnlocked(upload?.purchase?.progressRows);

  return (
    <PortalDataUploadSection
      title="Purchase Data Upload"
      description="Upload Excel files for purchase base data and purchase portal upload."
      baseTitle="Purchase Base Data"
      baseDescription="Upload the base purchase Excel file."
      portalTitle="Purchase Portal Upload"
      portalDescription="Upload the final portal purchase Excel file."
      section="purchase"
      upload={upload?.purchase}
      saving={saving}
      onUploadPortalDataExcel={onUploadPortalDataExcel}
      onRemovePortalDataExcel={onRemovePortalDataExcel}
      onUploadPortalDataImages={onUploadPortalDataImages}
      onRemovePortalDataImage={onRemovePortalDataImage}
      excelReadOnly={excelReadOnly}
      locked={!uploadUnlocked}
      lockMessage="Set 'Upload Complete' to 'Yes' in the tracker above to unlock purchase Excel uploads."
      beforeContent={showStatusRow ? (
        <div className="space-y-4">
          <PurchaseProgressTable
            rows={upload?.purchase?.progressRows}
            saving={saving}
            onNilUploadYes={onNilUploadYes}
            onChange={(progressRows) => onUpdatePortalDataSectionMeta('purchase', {
              progressRows,
              ...derivePurchaseDatesFromProgressRows(progressRows),
            })}
          />
          <PurchaseDataStatusTable
            purchase={upload?.purchase}
            sectionKey="purchase"
            saving={saving}
            user={user}
            onUpdate={(field, value) => onUpdatePortalDataMeta('purchase', field, value)}
            onUpdateDetails={(nextFields) => onUpdatePortalDataSectionMeta('purchase', nextFields)}
            onUploadImages={onUploadPortalDataImages}
            onRemoveImage={onRemovePortalDataImage}
          />
        </div>
      ) : null}
    >
      <>
        <PurchaseSummaryTable
          title="Purchase Upload Summary"
          caption="Data to be upload = Purchase Base Data / Quantity (TPA). Uploaded on portal = Purchase Portal Upload / Total Plastic Qty (Tons)."
          baseRows={upload?.purchase?.baseData?.rows || []}
          portalRows={upload?.purchase?.portalUpload?.rows || []}
          enableMaterialDrilldown
        />
        <EntitySummaryTables
          title="Purchase Upload Summary By Entity"
          caption="Grouped by Name of Entity from both purchase Excel sheets."
          baseRows={upload?.purchase?.baseData?.rows || []}
          portalRows={upload?.purchase?.portalUpload?.rows || []}
          highlightUnmatchedEntities
        />
      </>
    </PortalDataUploadSection>
  );
}

function SalesDataUploadContent({
  upload,
  saving,
  user,
  onUploadPortalDataExcel,
  onRemovePortalDataExcel,
  onUploadPortalDataImages,
  onRemovePortalDataImage,
  onUpdatePortalDataMeta,
  onUpdatePortalDataSectionMeta,
  showStatusRow = false,
  excelReadOnly = false,
  onNilUploadYes,
}) {
  const uploadUnlocked = isPurchaseUploadUnlocked(upload?.sales?.progressRows);

  return (
    <PortalDataUploadSection
      title="Sales Data Upload"
      description="Upload Excel files for sales base data and sales portal upload."
      baseTitle="Sales Base Data"
      baseDescription="Upload the base sales Excel file."
      portalTitle="Sales Portal Upload"
      portalDescription="Upload the final portal sales Excel file."
      section="sales"
      upload={upload?.sales}
      saving={saving}
      onUploadPortalDataExcel={onUploadPortalDataExcel}
      onRemovePortalDataExcel={onRemovePortalDataExcel}
      onUploadPortalDataImages={onUploadPortalDataImages}
      onRemovePortalDataImage={onRemovePortalDataImage}
      excelReadOnly={excelReadOnly}
      locked={!uploadUnlocked}
      lockMessage="Set 'Upload Complete' to 'Yes' in the tracker above to unlock sales Excel uploads."
      beforeContent={showStatusRow ? (
        <div className="space-y-4">
          <PurchaseProgressTable
            rows={upload?.sales?.progressRows}
            saving={saving}
            onNilUploadYes={onNilUploadYes}
            trackerLabel="Sales Progress Tracker"
            checklistTitle="Sales Data Upload Checklist"
            onChange={(progressRows) => onUpdatePortalDataSectionMeta('sales', {
              progressRows,
              ...derivePurchaseDatesFromProgressRows(progressRows),
            })}
          />
          <PurchaseDataStatusTable
            purchase={upload?.sales}
            sectionKey="sales"
            itemTitle="Sales data upload"
            drawerTitle="Sales data upload"
            saving={saving}
            user={user}
            onUpdate={(field, value) => onUpdatePortalDataMeta('sales', field, value)}
            onUpdateDetails={(nextFields) => onUpdatePortalDataSectionMeta('sales', nextFields)}
            onUploadImages={onUploadPortalDataImages}
            onRemoveImage={onRemovePortalDataImage}
          />
        </div>
      ) : null}
    >
      <>
        <PurchaseSummaryTable
          title="Sales Upload Summary"
          caption="Data to be upload = Sales Base Data / Quantity (TPA). Uploaded on portal = Sales Portal Upload / Total Plastic Qty (Tons)."
          baseRows={upload?.sales?.baseData?.rows || []}
          portalRows={upload?.sales?.portalUpload?.rows || []}
          requireCompletedPortalRows
          enableMaterialDrilldown
        />
        <EntitySummaryTables
          title="Sales Upload Summary By Entity"
          caption="Grouped by Name of Entity from both sales Excel sheets."
          baseRows={upload?.sales?.baseData?.rows || []}
          portalRows={upload?.sales?.portalUpload?.rows || []}
          requireCompletedPortalRows
        />
      </>
    </PortalDataUploadSection>
  );
}

function PurchaseProgressTable({
  rows,
  saving,
  onChange,
  onNilUploadYes,
  trackerLabel = 'Purchase Progress Tracker',
  checklistTitle = 'Purchase Data Upload Checklist',
}) {
  const normalizedRows = normalizePurchaseProgressRows(rows);
  const [validationMessages, setValidationMessages] = useState({});
  const [previewFile, setPreviewFile] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(-1);

  const updateRow = (index, nextFields) => {
    onChange(normalizedRows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...nextFields } : row
    )));
  };

  const clearValidationMessage = (particular) => {
    setValidationMessages((current) => {
      if (!current[particular]) return current;
      const nextMessages = { ...current };
      delete nextMessages[particular];
      return nextMessages;
    });
  };

  const updateRowStatus = (index, nextStatus) => {
    const row = normalizedRows[index];
    const proofRequired = row.particular !== 'Nil Upload';
    const requiresProofPrompt = nextStatus === 'Yes' && proofRequired;

    if (requiresProofPrompt) {
      setValidationMessages((current) => ({
        ...current,
        [row.particular]: 'Proof upload is required for a Yes status. Please upload supporting proof.',
      }));
    } else {
      clearValidationMessage(row.particular);
    }

    updateRow(index, { yesNo: nextStatus });
    if (row.particular === 'Nil Upload' && nextStatus === 'Yes') {
      onNilUploadYes?.();
    }
  };

  const uploadRowFiles = async (index, files) => {
    const uploadedFiles = await readPortalUploadFiles(files);
    if (!uploadedFiles.length) return;
    const row = normalizedRows[index];
    clearValidationMessage(row.particular);
    updateRow(index, { files: [...(row.files || []), ...uploadedFiles] });
  };

  const removeRowFile = (index, fileIndex) => {
    const row = normalizedRows[index];
    updateRow(index, {
      files: (row.files || []).filter((_, currentFileIndex) => currentFileIndex !== fileIndex),
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#fbfcfd_0%,#f6f8fa_100%)] px-5 py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{trackerLabel}</p>
            <h5 className="mt-1 text-base font-black text-slate-950">{checklistTitle}</h5>
          </div>
          <p className="text-xs font-semibold text-slate-500">Track stage, upload proof files, and capture remarks in one table.</p>
        </div>
      </div>
      <div className="overflow-x-auto bg-slate-100/50 p-3">
        <table className="min-w-[1220px] w-full border-separate border-spacing-0 overflow-hidden rounded-xl bg-white text-left shadow-sm ring-1 ring-slate-200">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-100 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
              <th className="w-16 border-b border-r border-slate-200 px-4 py-3">Sr.</th>
              <th className="border-b border-r border-slate-200 px-4 py-3">Particular</th>
              <th className="w-36 border-b border-r border-slate-200 px-4 py-3">Status</th>
              <th className="w-44 border-b border-r border-slate-200 px-4 py-3">Date</th>
              <th className="w-[340px] border-b border-r border-slate-200 px-4 py-3">Upload Proof</th>
              <th className="w-72 border-b border-slate-200 px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {normalizedRows.map((row, rowIndex) => (
              (() => {
                const needsProof = row.yesNo === 'Yes' && row.particular !== 'Nil Upload' && !row.files?.length;
                const validationMessage = needsProof ? validationMessages[row.particular] : '';
                return (
              <tr key={row.particular} className={`align-top transition odd:bg-white even:bg-slate-50/70 hover:bg-blue-50/40 ${
                needsProof ? 'bg-amber-50/50' : ''
              }`}>
                <td className="border-b border-r border-slate-200 px-4 py-4">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-100 px-2 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                    {rowIndex + 1}
                  </span>
                </td>
                <td className="border-b border-r border-slate-200 px-4 py-4">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-950">{row.particular}</p>
                    <p className="text-xs font-semibold text-slate-500">Update the current stage and attach supporting proof if available.</p>
                  </div>
                </td>
                <td className="border-b border-r border-slate-200 px-4 py-4">
                  <select
                    value={row.yesNo || ''}
                    onChange={(event) => updateRowStatus(rowIndex, event.target.value)}
                    disabled={saving}
                    className={`min-h-10 w-full rounded-lg border bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70 ${
                      validationMessage
                        ? 'border-red-300 focus:border-red-300 focus:ring-red-100'
                        : 'border-slate-300 focus:border-blue-300 focus:ring-blue-100'
                    }`}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  {validationMessage ? (
                    <p className="mt-2 text-xs font-bold text-red-600">{validationMessage}</p>
                  ) : null}
                </td>
                <td className="border-b border-r border-slate-200 px-4 py-4">
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
                    <input
                      type="date"
                      value={row.date || ''}
                      onChange={(event) => updateRow(rowIndex, { date: event.target.value })}
                      disabled={saving}
                      className="min-h-9 w-full bg-transparent text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                </td>
                <td className="border-b border-r border-slate-200 px-4 py-4">
                  <div
                    className={`rounded-lg p-3 shadow-sm ${
                      needsProof
                        ? 'border border-amber-300 bg-amber-50'
                        : dragOverIndex === rowIndex
                          ? 'border border-emerald-400 bg-emerald-50'
                          : 'border border-emerald-200 bg-emerald-50/50'
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!saving) setDragOverIndex(rowIndex);
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      if (!saving) setDragOverIndex(rowIndex);
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget)) return;
                      setDragOverIndex((current) => (current === rowIndex ? -1 : current));
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragOverIndex(-1);
                      if (saving) return;
                      uploadRowFiles(rowIndex, event.dataTransfer?.files);
                    }}
                  >
                    <div className="flex items-center">
                      <label className={`inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-extrabold shadow-sm transition ${
                        needsProof
                          ? 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                          : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      }`}>
                        <ImagePlus className="h-4 w-4" />
                        {needsProof ? 'Upload proof now' : 'Upload files'}
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf,.eml,.msg,message/rfc822,application/vnd.ms-outlook"
                          multiple
                          className="hidden"
                          disabled={saving}
                          onChange={(event) => {
                            uploadRowFiles(rowIndex, event.target.files);
                            event.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-slate-500">
                      Drag & drop images, PDF, Outlook mail here, or click to upload.
                    </p>
                    {needsProof ? (
                      <p className="mt-2 text-xs font-bold text-amber-700">You selected Yes. Please upload proof to complete this row.</p>
                    ) : null}
                    {row.yesNo === 'Yes' && row.files?.length ? (
                      <p className="mt-2 text-xs font-bold text-emerald-700">Proof uploaded for this Yes status.</p>
                    ) : null}
                    {row.files?.length ? (
                      <div className="mt-3 space-y-2">
                        {row.files.map((file, fileIndex) => (
                          <div key={`${file.name || 'proof'}-${fileIndex}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              disabled={!file?.dataUrl}
                              className="min-w-0 flex-1 truncate text-left text-xs font-bold text-emerald-700 transition hover:text-emerald-800 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              {file.name || `Proof ${fileIndex + 1}`}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRowFile(rowIndex, fileIndex)}
                              disabled={saving}
                              className="inline-flex min-h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td className="border-b border-slate-200 px-4 py-4">
                  <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Notes</label>
                    <textarea
                      value={row.remarks || ''}
                      onChange={(event) => updateRow(rowIndex, { remarks: event.target.value })}
                      disabled={saving}
                      rows={3}
                      className="w-full resize-y bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                      placeholder="Add remarks, exceptions, or pending notes"
                    />
                  </div>
                </td>
              </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </div>
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}

function PurchaseDataStatusTable({
  purchase,
  sectionKey = 'purchase',
  itemTitle = 'Purchase data upload',
  drawerTitle = 'Purchase data upload',
  saving,
  user,
  documentsOnly = false,
  requirePortalUpload = true,
  startDateLabel,
  endDateLabel,
  startDateHelp,
  endDateHelp,
  onUpdate,
  onUpdateDetails,
  onUploadImages,
  onRemoveImage,
}) {
  const [remarksDrawerOpen, setRemarksDrawerOpen] = useState(false);
  const [managerReviewDrawerOpen, setManagerReviewDrawerOpen] = useState(false);
  const [complianceReviewDrawerOpen, setComplianceReviewDrawerOpen] = useState(false);
  const uploadComplete = documentsOnly
    ? Boolean(purchase?.images?.length)
    : requirePortalUpload
      ? hasUploadedFile(purchase?.baseData) && hasUploadedFile(purchase?.portalUpload)
      : hasUploadedFile(purchase?.baseData);
  const status = uploadComplete ? 'Completed' : 'Pending';
  const remarks = normalizeRemarks(purchase?.remarks);
  const purchaseSentToManager = uploadComplete || Boolean(purchase?.managerVerificationStatus);
  const managerApproved = purchase?.managerVerificationStatus === 'Approved';
  const managerRejected = purchase?.managerVerificationStatus === 'Rejected';
  const canVerifyAsManager = canVerifyPurchaseData(user);
  const canVerifyAsCompliance = canVerifyCompliancePurchaseData(user);
  const complianceApproved = purchase?.complianceVerificationStatus === 'Approved';
  const complianceRejected = purchase?.complianceVerificationStatus === 'Rejected';
  const canEditUserRemarks = !canVerifyAsManager;
  const reviewThread = normalizeReviewThread(purchase);
  const latestReview = reviewThread[reviewThread.length - 1];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 p-4 xl:grid-cols-[1.1fr_1fr_1fr_0.8fr_0.9fr_1fr] xl:items-end">
        <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Compliance Status</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-100">
              1
            </span>
            <h5 className="break-words text-sm font-extrabold text-slate-950">{itemTitle}</h5>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{startDateLabel || 'Received data from client date'}</span>
          <input
            type="date"
            value={purchase?.startDate || ''}
            readOnly
            disabled
            className="min-h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none opacity-80"
          />
          <span className="text-xs font-semibold text-slate-500">{startDateHelp || 'Auto-filled from the `Received from client` row in the tracker above.'}</span>
        </label>

        {requirePortalUpload ? (
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{endDateLabel || 'Data upload on portal date'}</span>
            <input
              type="date"
              value={purchase?.endDate || ''}
              readOnly
              disabled
              className="min-h-11 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none opacity-80"
            />
            <span className="text-xs font-semibold text-slate-500">{endDateHelp || 'Auto-filled from the `Upload Complete` row when it is marked `Yes` in the tracker above.'}</span>
          </label>
        ) : (
          <div className="hidden xl:block" />
        )}

        <div className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Status</span>
          <span className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg border px-3 text-sm font-extrabold ${
            uploadComplete
              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {status}
          </span>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Remarks</span>
          <button
            type="button"
            onClick={() => setRemarksDrawerOpen(true)}
            disabled={saving || !canEditUserRemarks}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
            title={canEditUserRemarks ? 'Edit user remarks' : 'User remarks are read only for managers'}
          >
            <Plus className="h-4 w-4" />
            {remarks.length ? `Remarks (${remarks.length})` : 'No remarks'}
          </button>
        </div>

        <ComplianceImageControl
          images={purchase?.images || []}
          saving={saving}
          documentsOnly={documentsOnly}
          onUpload={(files) => onUploadImages?.(sectionKey, files)}
          onRemove={(imageIndex) => onRemoveImage?.(sectionKey, imageIndex)}
        />
      </div>

      {purchaseSentToManager ? (
        <div className="border-t border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Manager Verification</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-xs font-extrabold ${
                  managerApproved
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                    : managerRejected
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                  {managerApproved ? 'Approved by manager' : managerRejected ? 'Rejected by manager' : 'Pending manager verification'}
                </span>
                {managerApproved || managerRejected ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {purchase?.managerVerifiedBy || 'Manager'} - {formatDate(purchase?.managerVerifiedAt)}
                  </span>
                ) : null}
              </div>
              {latestReview?.message ? (
                <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">{latestReview.message}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setManagerReviewDrawerOpen(true)}
              disabled={saving || !canVerifyAsManager}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              title={canVerifyAsManager ? `Review ${itemTitle}` : 'Only manager users can review'}
            >
              <BadgeCheck className="h-4 w-4" />
              {managerApproved || managerRejected ? 'Review Again' : 'Verify'}
            </button>
          </div>
        </div>
      ) : null}

      {managerApproved ? (
        <div className="border-t border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Compliance Manager Review</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-xs font-extrabold ${
                  complianceApproved
                    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                    : complianceRejected
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}>
                  {complianceApproved ? 'Approved by compliance manager' : complianceRejected ? 'Rejected by compliance manager' : 'Pending compliance manager review'}
                </span>
                {complianceApproved || complianceRejected ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {purchase?.complianceVerifiedBy || 'Compliance Manager'} - {formatDate(purchase?.complianceVerifiedAt)}
                  </span>
                ) : null}
              </div>
              {normalizeReviewThread(purchase, 'compliance').at(-1)?.message ? (
                <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
                  {normalizeReviewThread(purchase, 'compliance').at(-1).message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setComplianceReviewDrawerOpen(true)}
              disabled={saving || !canVerifyAsCompliance}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              title={canVerifyAsCompliance ? 'Review as compliance manager' : 'Only compliance manager users can review'}
            >
              <BadgeCheck className="h-4 w-4" />
              {complianceApproved || complianceRejected ? 'Review Again' : 'Compliance Review'}
            </button>
          </div>
        </div>
      ) : null}

      {remarksDrawerOpen ? (
        <RemarksDrawer
          title={drawerTitle}
          purchase={purchase}
          saving={saving}
          onClose={() => setRemarksDrawerOpen(false)}
          onSave={(nextDetails) => {
            const selectedReason = normalizeRemarks(nextDetails.remarks)[0] || '';
            onUpdateDetails({
              ...nextDetails,
              ...(selectedReason === 'Manager reject the data'
                ? {
                    managerVerificationStatus: 'Pending',
                    managerVerifiedAt: '',
                    managerVerifiedBy: '',
                  }
                : {}),
            });
            setRemarksDrawerOpen(false);
          }}
        />
      ) : null}

      {managerReviewDrawerOpen ? (
        <ManagerReviewDrawer
          purchase={purchase}
          title={drawerTitle}
          saving={saving}
          onClose={() => setManagerReviewDrawerOpen(false)}
          onDecision={(decision, review) => {
            const reviewedAt = new Date().toISOString();
            const reviewedBy = user?.name || user?.email || 'Manager';
            onUpdateDetails({
              managerVerificationStatus: decision,
              managerReview: review,
              managerReviewThread: [
                ...normalizeReviewThread(purchase),
                {
                  decision,
                  message: review,
                  by: reviewedBy,
                  at: reviewedAt,
                },
              ],
              managerVerifiedAt: reviewedAt,
              managerVerifiedBy: reviewedBy,
              complianceVerificationStatus: decision === 'Approved' ? 'Pending' : '',
            });
            setManagerReviewDrawerOpen(false);
          }}
        />
      ) : null}

      {complianceReviewDrawerOpen ? (
        <ManagerReviewDrawer
          purchase={purchase}
          title={drawerTitle}
          reviewType="compliance"
          saving={saving}
          onClose={() => setComplianceReviewDrawerOpen(false)}
          onDecision={(decision, review) => {
            const reviewedAt = new Date().toISOString();
            const reviewedBy = user?.name || user?.email || 'Compliance Manager';
            onUpdateDetails({
              complianceVerificationStatus: decision,
              complianceReview: review,
              complianceReviewThread: [
                ...normalizeReviewThread(purchase, 'compliance'),
                {
                  decision,
                  message: review,
                  by: reviewedBy,
                  at: reviewedAt,
                },
              ],
              complianceVerifiedAt: reviewedAt,
              complianceVerifiedBy: reviewedBy,
            });
            setComplianceReviewDrawerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function ManagerReviewDrawer({ purchase, title = 'Purchase data upload', reviewType = 'manager', readOnly = false, saving, onClose, onDecision }) {
  const [review, setReview] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const reviewThread = normalizeReviewThread(purchase, reviewType);
  const managerThread = normalizeReviewThread(purchase, 'manager');
  const complianceThread = normalizeReviewThread(purchase, 'compliance');
  const reviewerLabel = reviewType === 'compliance' ? 'Compliance Manager' : 'Manager';
  const userRemarks = normalizeRemarks(purchase?.remarks);
  const reviewWordCount = countWords(review);
  const latestReview = reviewThread[0];
  const reviewStatus = latestReview?.decision || 'Pending';
  const reviewedBy = latestReview?.by || reviewerLabel;
  const reviewedAt = latestReview?.at ? formatDate(latestReview.at) : 'Awaiting review';
  const latestComplianceReview = complianceThread[complianceThread.length - 1];
  const complianceStatus = purchase?.complianceVerificationStatus || 'Pending';

  useEffect(() => {
    setReview('');
  }, [purchase?.managerVerificationStatus, purchase?.complianceVerificationStatus, reviewType]);

  const showToast = (message, title = 'Action required') => {
    setToastMessage({ title, message });
    window.setTimeout(() => setToastMessage(null), 3200);
  };

  const updateReview = (value) => {
    const limitedValue = limitWords(value, 250);
    setReview(limitedValue);
    if (countWords(value) > 250) {
      showToast('Review remarks are limited to 250 words.');
    }
  };

  const handleDecision = (decision) => {
    const normalizedReview = review.trim();
    if (!normalizedReview) {
      showToast('Remarks are required before approve or reject.');
      return;
    }
    onDecision(decision, normalizedReview);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close manager review drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        {toastMessage ? (
          <div className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400 text-emerald-600">
                <BadgeCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold text-slate-950">{toastMessage.title}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{toastMessage.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
        <div className="border-b border-[#ACC0D3] bg-[linear-gradient(135deg,#EEF4F8_0%,#F5F9FC_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#30525C]">{reviewerLabel} Review</p>
              <h3 className="mt-1 break-words text-lg font-extrabold text-slate-950">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
              aria-label="Close manager review"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Status</span>
              </div>
              <p className="mt-2 text-sm font-extrabold text-slate-950">{reviewStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <UserRound className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Reviewed By</span>
              </div>
              <p className="mt-2 truncate text-sm font-extrabold text-slate-950">{reviewedBy}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarClock className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em]">Last Update</span>
              </div>
              <p className="mt-2 text-sm font-extrabold text-slate-950">{reviewedAt}</p>
            </div>
          </div>
          <VerificationProgress purchase={purchase} />
          {readOnly ? (
            <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              Managers can view this compliance review, but only compliance managers can approve or reject it.
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <CalendarClock className="h-4 w-4" />
              <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Submitted Dates</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <StatusPill label="Client data" value={purchase?.startDate} />
              <StatusPill label="Portal upload" value={purchase?.endDate} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <p className="text-xs font-extrabold uppercase tracking-[0.12em]">User Remarks</p>
            </div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Selected Remarks</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{userRemarks[0] || 'No remarks submitted'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#ACC0D3] bg-[#F5F9FC] px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Revised Client Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{purchase?.revisedStartDate || '-'}</p>
                </div>
                <div className="rounded-2xl border border-[#ACC0D3] bg-[#F5F9FC] px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Revised Portal Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{purchase?.revisedEndDate || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {reviewType === 'compliance' && managerThread.length ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Manager Remarks</p>
              {managerThread.map((entry, index) => (
                <div key={`${entry.at || index}-${entry.decision}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                      entry.decision === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.decision}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {entry.by || 'Manager'} - {formatDate(entry.at)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{entry.message}</p>
                </div>
              ))}
            </div>
          ) : null}

          {reviewType === 'manager' ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Compliance Manager Review</p>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                  complianceStatus === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : complianceStatus === 'Rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-50 text-amber-800'
                }`}>
                  {complianceStatus}
                </span>
              </div>
              {latestComplianceReview ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {latestComplianceReview.by || 'Compliance Manager'} - {formatDate(latestComplianceReview.at)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                    {latestComplianceReview.message}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                  No compliance manager review available yet.
                </p>
              )}
            </div>
          ) : null}

          {reviewThread.length ? (
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Review History</p>
              {reviewThread.map((entry, index) => (
                <div
                  key={`${entry.at || index}-${entry.decision}`}
                  className={`rounded-2xl border p-4 ${
                    entry.decision === 'Approved'
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-red-200 bg-red-50/70'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                      entry.decision === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.decision}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {entry.by || 'Manager'} - {formatDate(entry.at)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{entry.message}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Next {reviewerLabel.toLowerCase()} review</span>
              <span className={`text-right text-xs font-extrabold ${reviewWordCount >= 250 ? 'text-amber-700' : 'text-slate-500'}`}>
                {reviewWordCount}/250 words
              </span>
            </div>
            <textarea
              value={review}
              onChange={(event) => updateReview(event.target.value)}
              rows={4}
              placeholder={readOnly ? 'Read-only review view for managers' : `Write next ${reviewerLabel.toLowerCase()} note for approval or rejection`}
              disabled={saving || readOnly}
              className="mt-3 min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-950"
            />
            <p className="mt-2 text-xs font-medium text-slate-500">
              {readOnly ? 'This panel is view-only for managers.' : 'Add a short, decision-ready note for approval or rejection.'}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="admin-secondary-button justify-center">
              Cancel
            </button>
            {!readOnly ? (
              <button
                type="button"
                onClick={() => handleDecision('Rejected')}
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            ) : null}
            {!readOnly ? (
              <button
                type="button"
                onClick={() => handleDecision('Approved')}
                disabled={saving}
                className="admin-primary-button justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function RemarksDrawer({ title, purchase, saving, onClose, onSave }) {
  const [selectedRemark, setSelectedRemark] = useState(() => normalizeRemarks(purchase?.remarks)[0] || '');
  const [revisedStartDate, setRevisedStartDate] = useState(purchase?.revisedStartDate || '');
  const [revisedEndDate, setRevisedEndDate] = useState(purchase?.revisedEndDate || '');
  const hasRemark = Boolean(selectedRemark);
  const managerThread = normalizeReviewThread(purchase, 'manager');
  const complianceThread = normalizeReviewThread(purchase, 'compliance');

  useEffect(() => {
    setSelectedRemark(normalizeRemarks(purchase?.remarks)[0] || '');
    setRevisedStartDate(purchase?.revisedStartDate || '');
    setRevisedEndDate(purchase?.revisedEndDate || '');
  }, [purchase?.remarks, purchase?.revisedStartDate, purchase?.revisedEndDate]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Close remarks drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
        <div className="border-b border-[#ACC0D3] bg-[linear-gradient(135deg,#EEF4F8_0%,#F5F9FC_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#30525C]">User Remarks</p>
              <h3 className="mt-1 break-words text-lg font-extrabold text-slate-950">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
              aria-label="Close remarks"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Selected</p>
              <p className="mt-2 text-sm font-extrabold text-slate-950">{hasRemark ? '1 remark' : 'No remark'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Client Date</p>
              <p className="mt-2 text-sm font-extrabold text-slate-950">{revisedStartDate || '-'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Portal Date</p>
              <p className="mt-2 text-sm font-extrabold text-slate-950">{revisedEndDate || '-'}</p>
            </div>
          </div>
          <VerificationProgress purchase={purchase} />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#F8FBFD] p-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Remark Selection</p>
            </div>
            <label className="mt-3 grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Select remarks</span>
              <select
                value={selectedRemark}
                onChange={(event) => setSelectedRemark(event.target.value)}
                disabled={saving}
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">Select remarks</option>
                {purchaseRemarkOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <span className="text-xs font-medium text-slate-500">Choose the most relevant reason before saving revised dates.</span>
            </label>
          </section>

          {selectedRemark ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarClock className="h-4 w-4" />
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]">Revised Dates</p>
              </div>
              <div className="mt-3 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Revised Received data from client date</span>
                  <input
                    type="date"
                    value={revisedStartDate}
                    onChange={(event) => setRevisedStartDate(event.target.value)}
                    disabled={saving}
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">Revised Data upload on portal date</span>
                  <input
                    type="date"
                    value={revisedEndDate}
                    onChange={(event) => setRevisedEndDate(event.target.value)}
                    disabled={saving}
                    className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </label>
              </div>
            </section>
          ) : null}

          <ReviewThreadPanel
            title="Manager Remarks"
            emptyMessage="No manager remarks yet."
            thread={managerThread}
          />

          <ReviewThreadPanel
            title="Compliance Manager Remarks"
            emptyMessage="No compliance manager remarks yet."
            thread={complianceThread}
          />
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="admin-secondary-button justify-center">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave({
                remarks: selectedRemark ? [selectedRemark] : [],
                revisedStartDate: selectedRemark ? revisedStartDate : '',
                revisedEndDate: selectedRemark ? revisedEndDate : '',
              })}
              disabled={saving}
              className="admin-primary-button justify-center disabled:cursor-wait disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save remarks'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function VerificationProgress({ purchase }) {
  const steps = getVerificationProgressSteps(purchase);

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Verification Progress</p>
        <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
          {steps.filter((step) => step.state === 'complete').length}/{steps.length}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const isComplete = step.state === 'complete';
          const isRejected = step.state === 'rejected';
          const isActive = step.state === 'active';
          const circleClass = isComplete
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : isRejected
              ? 'border-red-500 bg-red-500 text-white'
              : isActive
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-300 bg-white text-slate-400';
          const lineClass = isComplete ? 'bg-emerald-500' : isRejected ? 'bg-red-400' : 'bg-slate-200';

          return (
            <div key={step.label} className="relative flex gap-3 sm:block">
              {index < steps.length - 1 ? (
                <span className={`absolute left-4 top-8 h-[calc(100%-1.25rem)] w-0.5 sm:left-[calc(50%+1rem)] sm:top-4 sm:h-0.5 sm:w-[calc(100%-2rem)] ${lineClass}`} />
              ) : null}
              <div className="relative z-10 flex sm:flex-col sm:items-center">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${circleClass}`}>
                  {isComplete ? <BadgeCheck className="h-4 w-4" /> : isRejected ? <X className="h-4 w-4" /> : index + 1}
                </span>
                <div className="ml-3 min-w-0 sm:ml-0 sm:mt-2 sm:text-center">
                  <p className="text-sm font-extrabold text-slate-950">{step.label}</p>
                  <p className={`mt-1 text-xs font-semibold ${
                    isComplete
                      ? 'text-emerald-700'
                      : isRejected
                        ? 'text-red-700'
                        : isActive
                          ? 'text-amber-700'
                          : 'text-slate-500'
                  }`}>
                    {step.caption}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewThreadPanel({ title, emptyMessage, thread }) {
  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      {thread.length ? thread.map((entry, index) => (
        <div key={`${entry.at || index}-${entry.decision}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
              entry.decision === 'Approved'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-700'
            }`}>
              {entry.decision || 'Review'}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {entry.by || 'Reviewer'} - {formatDate(entry.at)}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">{entry.message || '-'}</p>
        </div>
      )) : (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

function ComplianceImageControl({ images, saving, documentsOnly = false, hideLabel = false, onUpload, onRemove }) {
  const [previewFile, setPreviewFile] = useState(null);

  return (
    <div className="grid gap-2">
      {hideLabel ? null : (
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
          {documentsOnly ? 'Images / PDF' : 'Images / PDF / Emails'}
        </span>
      )}
      <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-extrabold text-emerald-700 transition hover:bg-emerald-100">
        <ImagePlus className="h-4 w-4" />
        {images.length ? `Files (${images.length})` : documentsOnly ? 'Upload images / PDF' : 'Upload images / PDF / emails'}
        <input
          type="file"
          accept={documentsOnly ? 'image/*,.pdf,application/pdf' : 'image/*,.pdf,application/pdf,.eml,.msg,message/rfc822,application/vnd.ms-outlook'}
          multiple
          className="hidden"
          disabled={saving}
          onChange={(event) => {
            onUpload(event.target.files);
            event.target.value = '';
          }}
        />
      </label>
      {images.length ? (
        <div className="flex flex-wrap gap-1.5">
          {images.map((image, index) => (
            <span key={`${image.name || 'image'}-${index}`} className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setPreviewFile(image)}
                disabled={!image?.dataUrl}
                className="max-w-40 truncate px-2 py-1.5 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {image.name || `File ${index + 1}`}
              </button>
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={saving}
                className="border-l border-slate-200 px-2 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

function PortalDataUploadSection({
  title,
  description,
  baseTitle,
  baseDescription,
  portalTitle,
  portalDescription,
  section,
  upload,
  saving,
  onUploadPortalDataExcel,
  onRemovePortalDataExcel,
  onUploadPortalDataImages,
  onRemovePortalDataImage,
  beforeContent,
  excelReadOnly = false,
  locked = false,
  lockMessage = '',
  showPortalUpload = true,
  children,
}) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-extrabold text-slate-950">{title}</h4>
        <p className="text-xs font-semibold text-slate-500">{description}</p>
      </div>
      {beforeContent ? <div className="mt-5">{beforeContent}</div> : null}
      {locked ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {lockMessage || 'Complete the required tracker step above to unlock uploads.'}
        </div>
      ) : null}
      <div className={`mt-5 grid gap-4 ${showPortalUpload ? 'xl:grid-cols-2' : ''}`}>
        <ExcelUploadBox
          title={baseTitle}
          description={baseDescription}
          file={upload?.baseData}
          saving={saving}
          readOnly={excelReadOnly}
          locked={locked}
          onUpload={(file) => onUploadPortalDataExcel(section, 'baseData', file)}
          onRemove={() => onRemovePortalDataExcel(section, 'baseData')}
        />
        {showPortalUpload ? (
          <ExcelUploadBox
            title={portalTitle}
            description={portalDescription}
            file={upload?.portalUpload}
            saving={saving}
            readOnly={excelReadOnly}
            locked={locked}
            onUpload={(file) => onUploadPortalDataExcel(section, 'portalUpload', file)}
            onRemove={() => onRemovePortalDataExcel(section, 'portalUpload')}
          />
        ) : null}
      </div>
      {children}
    </div>
  );
}

function PurchaseSummaryTable({
  title = 'Purchase Upload Summary',
  caption,
  firstColumnLabel = 'Category of Plastic',
  baseRows,
  portalRows,
  requireCompletedPortalRows = false,
  summaryBuilder = buildPurchaseSummary,
  enableMaterialDrilldown = false,
}) {
  const summary = summaryBuilder(baseRows, portalRows, { requireCompletedPortalRows });
  const materialSummary = useMemo(() => (
    enableMaterialDrilldown
      ? buildPurchaseSummaryByMaterial(baseRows, portalRows, { requireCompletedPortalRows })
      : {}
  ), [baseRows, enableMaterialDrilldown, portalRows, requireCompletedPortalRows]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories((current) => ({ ...current, [category]: !current[category] }));
  };

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h5 className="text-sm font-extrabold text-slate-950">{title}</h5>
        <p className="text-xs font-semibold text-slate-500">{caption}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th rowSpan="2" className="border border-slate-300 bg-slate-800 px-3 py-3 text-white">{firstColumnLabel}</th>
              <th colSpan="6" className="border border-slate-300 bg-emerald-700 px-3 py-2 text-white">REGISTERED</th>
              <th colSpan="6" className="border border-slate-300 bg-orange-600 px-3 py-2 text-white">UNREGISTERED</th>
            </tr>
            <tr className="text-xs text-white">
              {['Data to be upload', 'Uploaded on portal', 'Qty Diff', 'GST to be upload', 'GST uploaded', 'GST Diff'].map((header) => (
                <th key={`registered-${header}`} className="border border-slate-300 bg-emerald-700 px-3 py-2">{header}</th>
              ))}
              {['Data to be upload', 'Uploaded on portal', 'Qty Diff', 'GST to be upload', 'GST uploaded', 'GST Diff'].map((header) => (
                <th key={`unregistered-${header}`} className="border border-slate-300 bg-orange-600 px-3 py-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => {
              const materialRows = materialSummary[row.category] || [];
              const canExpand = row.category !== 'Total' && materialRows.length > 0;
              const expanded = Boolean(expandedCategories[row.category]);
              return (
              <Fragment key={row.category}>
              <tr className={row.category === 'Total' ? 'bg-slate-200 font-extrabold' : 'bg-white'}>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-900">
                  {canExpand ? (
                    <button type="button" onClick={() => toggleCategory(row.category)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-200" aria-expanded={expanded}>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
                      {row.category}
                    </button>
                  ) : row.category}
                </td>
                <SummaryCell value={row.registered.baseQty} tone="green" />
                <SummaryCell value={row.registered.portalQty} tone="green" />
                <SummaryCell value={row.registered.qtyDiff} tone="green" />
                <SummaryCell value={row.registered.baseGst} tone="green" />
                <SummaryCell value={row.registered.portalGst} tone="green" />
                <SummaryCell value={row.registered.gstDiff} tone="green" />
                <SummaryCell value={row.unregistered.baseQty} tone="orange" />
                <SummaryCell value={row.unregistered.portalQty} tone="orange" />
                <SummaryCell value={row.unregistered.qtyDiff} tone="orange" />
                <SummaryCell value={row.unregistered.baseGst} tone="orange" />
                <SummaryCell value={row.unregistered.portalGst} tone="orange" />
                <SummaryCell value={row.unregistered.gstDiff} tone="orange" />
              </tr>
              {expanded ? materialRows.map((materialRow) => (
                <tr key={`${row.category}-${materialRow.materialKey}`} className="bg-sky-50/60">
                  <td className="border border-slate-300 bg-sky-100/80 px-3 py-2 text-left text-sky-950">
                    <span className="pl-6 text-[10px] font-extrabold uppercase tracking-wide text-sky-700">Plastic Material Type: </span>
                    <span className="font-bold">{materialRow.materialType}</span>
                  </td>
                  <SummaryCell value={materialRow.registered.baseQty} tone="green" />
                  <SummaryCell value={materialRow.registered.portalQty} tone="green" />
                  <SummaryCell value={materialRow.registered.qtyDiff} tone="green" />
                  <SummaryCell value={materialRow.registered.baseGst} tone="green" />
                  <SummaryCell value={materialRow.registered.portalGst} tone="green" />
                  <SummaryCell value={materialRow.registered.gstDiff} tone="green" />
                  <SummaryCell value={materialRow.unregistered.baseQty} tone="orange" />
                  <SummaryCell value={materialRow.unregistered.portalQty} tone="orange" />
                  <SummaryCell value={materialRow.unregistered.qtyDiff} tone="orange" />
                  <SummaryCell value={materialRow.unregistered.baseGst} tone="orange" />
                  <SummaryCell value={materialRow.unregistered.portalGst} tone="orange" />
                  <SummaryCell value={materialRow.unregistered.gstDiff} tone="orange" />
                </tr>
              )) : null}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EntitySummaryTables({
  title,
  caption,
  baseRows,
  portalRows,
  requireCompletedPortalRows = false,
  highlightUnmatchedEntities = false,
}) {
  const summary = buildPurchaseSummaryByEntity(baseRows, portalRows, { requireCompletedPortalRows });
  const rows = summary.filter((row) => row.category !== 'Total');
  const registeredRows = rows.filter((row) => hasSummaryValues(row.registered));
  const unregisteredRows = rows.filter((row) => hasSummaryValues(row.unregistered));

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h5 className="text-sm font-extrabold text-slate-950">{title}</h5>
        <p className="text-xs font-semibold text-slate-500">{caption}</p>
      </div>
      <div className="grid gap-5 p-4 xl:grid-cols-2">
        <EntitySummaryTable
          title="Registered Entity List"
          rows={registeredRows}
          group="registered"
          tone="green"
          highlightUnmatchedEntities={highlightUnmatchedEntities}
        />
        <EntitySummaryTable
          title="Unregistered Entity List"
          rows={unregisteredRows}
          group="unregistered"
          tone="orange"
        />
      </div>
    </section>
  );
}

function EntitySummaryTable({ title, rows, group, tone, highlightUnmatchedEntities }) {
  const total = buildEntityGroupTotal(rows, group);
  const headerClass = tone === 'green' ? 'bg-emerald-700' : 'bg-orange-600';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={`${headerClass} px-4 py-3 text-center text-sm font-extrabold text-white`}>
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-white">
              <th className="border border-slate-300 bg-slate-800 px-3 py-2">Name of Entity</th>
              {['Data to be upload', 'Uploaded on portal', 'Qty Diff', 'GST to be upload', 'GST uploaded', 'GST Diff'].map((header) => (
                <th key={header} className={`border border-slate-300 px-3 py-2 ${headerClass}`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.category} className="bg-white">
                <td className={`border border-slate-300 px-3 py-2 font-bold ${
                  highlightUnmatchedEntities && isUnmatchedEntity(row)
                    ? 'bg-amber-100 text-amber-950'
                    : 'bg-slate-100 text-slate-900'
                }`}>
                  {row.category}
                </td>
                <SummaryCell value={row[group].baseQty} tone={tone} />
                <SummaryCell value={row[group].portalQty} tone={tone} />
                <SummaryCell value={row[group].qtyDiff} tone={tone} />
                <SummaryCell value={row[group].baseGst} tone={tone} />
                <SummaryCell value={row[group].portalGst} tone={tone} />
                <SummaryCell value={row[group].gstDiff} tone={tone} />
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="border border-slate-300 px-3 py-6 text-sm font-bold text-slate-500">
                  No entities found.
                </td>
              </tr>
            )}
            <tr className="bg-slate-200 font-extrabold">
              <td className="border border-slate-300 bg-slate-200 px-3 py-2 font-bold text-slate-900">Total</td>
              <SummaryCell value={total.baseQty} tone={tone} />
              <SummaryCell value={total.portalQty} tone={tone} />
              <SummaryCell value={total.qtyDiff} tone={tone} />
              <SummaryCell value={total.baseGst} tone={tone} />
              <SummaryCell value={total.portalGst} tone={tone} />
              <SummaryCell value={total.gstDiff} tone={tone} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrePostSummaryTable({ purchaseRows, prePostRows }) {
  const summary = buildPrePostSummary(purchaseRows, prePostRows);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h5 className="text-sm font-extrabold text-slate-950">Pre/Post Upload Summary</h5>
        <p className="text-xs font-semibold text-slate-500">
          Pre/Post values are calculated as Quantity (TPA) multiplied by Recycled Plastic %.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th rowSpan="2" className="border border-slate-300 bg-slate-800 px-3 py-3 text-left text-white">Category of Plastic</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-700 px-3 py-3 text-white">Total Purchase</th>
              <th colSpan="4" className="border border-slate-300 bg-emerald-700 px-3 py-2 text-white">Total Sales</th>
              <th rowSpan="2" className="border border-slate-300 bg-orange-600 px-3 py-3 text-white">Difference</th>
            </tr>
            <tr className="text-xs text-white">
              {['Pre Consumer', 'Post Consumer', 'Export', 'Total Consumption'].map((header) => (
                <th key={header} className="border border-slate-300 bg-emerald-700 px-3 py-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.category} className={row.category === 'Total' ? 'bg-slate-100 font-extrabold' : 'bg-white'}>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold text-slate-900">{row.category}</td>
                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.totalPurchase)}</td>
                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.preConsumer)}</td>
                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.postConsumer)}</td>
                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.exportValue)}</td>
                <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.totalConsumption)}</td>
                <td className="border border-slate-300 bg-orange-50 px-3 py-2 font-semibold text-slate-900">{formatDifference(row.totalPurchase, row.totalConsumption)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StateWisePrePostTable({ prePostRows }) {
  const rows = buildStateWisePrePostSummary(prePostRows);
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStates, setExpandedStates] = useState(() => new Set());
  const dataRows = rows.filter((row) => row.state !== 'Total');
  const totalRow = rows.find((row) => row.state === 'Total');
  const totalPages = Math.max(1, Math.ceil(dataRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = dataRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleRows = totalRow ? [...pageRows, totalRow] : pageRows;
  const toggleState = (stateKey) => {
    setExpandedStates((current) => {
      const next = new Set(current);
      if (next.has(stateKey)) next.delete(stateKey);
      else next.add(stateKey);
      return next;
    });
  };

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h5 className="text-sm font-extrabold text-slate-950">State Wise</h5>
          <p className="text-xs font-semibold text-slate-500">
            Values are grouped from Pre/Post Upload by state name. Expand a state to view its Category of Plastic breakdown.
          </p>
        </div>
        {dataRows.length ? (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            >
              {[5, 10, 15, 20, 25].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-white">
              <th className="border border-slate-300 bg-slate-800 px-3 py-3 text-left">State Name</th>
              {['Pre Consumer', 'Post Consumer', 'Export', 'Total'].map((header) => (
                <th key={header} className="border border-slate-300 bg-emerald-700 px-3 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? visibleRows.map((row) => {
              const isTotal = row.state === 'Total';
              const isExpanded = !isTotal && expandedStates.has(row.key);
              return (
                <Fragment key={row.key || row.state}>
                  <tr className={isTotal ? 'bg-slate-100 font-extrabold' : 'bg-white'}>
                    <td className="border border-slate-300 bg-slate-100 p-0 text-left font-bold text-slate-900">
                      {isTotal ? (
                        <span className="block px-3 py-2">{row.state}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleState(row.key)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-200/70"
                        >
                          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          <span>{row.state}</span>
                          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold text-slate-500 ring-1 ring-slate-200">
                            {row.categories.length} categories
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.preConsumer)}</td>
                    <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.postConsumer)}</td>
                    <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.exportValue)}</td>
                    <td className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">{formatFlexibleNumber(row.total)}</td>
                  </tr>
                  {isExpanded ? row.categories.map((category) => (
                    <tr key={`${row.key}-${category.category}`} className="bg-white">
                      <td className="border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-left text-xs font-extrabold text-slate-700">
                        <span className="text-slate-400">Category of Plastic:</span> {category.category}
                      </td>
                      <td className="border border-slate-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-slate-700">{formatFlexibleNumber(category.preConsumer)}</td>
                      <td className="border border-slate-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-slate-700">{formatFlexibleNumber(category.postConsumer)}</td>
                      <td className="border border-slate-300 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-slate-700">{formatFlexibleNumber(category.exportValue)}</td>
                      <td className="border border-slate-300 bg-emerald-50/50 px-3 py-2 text-xs font-extrabold text-slate-800">{formatFlexibleNumber(category.total)}</td>
                    </tr>
                  )) : null}
                </Fragment>
              );
            }) : (
              <tr>
                <td colSpan="5" className="border border-slate-300 px-3 py-6 text-sm font-bold text-slate-500">
                  Upload Pre/Post data with a State Name column to view state-wise totals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {dataRows.length ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-slate-500">
            Showing {((safePage - 1) * pageSize) + 1}-{Math.min(safePage * pageSize, dataRows.length)} of {dataRows.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 text-xs font-extrabold text-slate-600">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AnnualReturnTable({ prePostRows }) {
  const rows = buildAnnualReturnSummary(prePostRows);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h5 className="text-sm font-extrabold text-slate-950">Annual Return</h5>
        <p className="text-xs font-semibold text-slate-500">
          Values are grouped by Year and Material Type from Pre/Post Upload.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-slate-950">
              <th className="border border-slate-300 bg-slate-100 px-3 py-3">Year</th>
              {annualReturnColumns.map((column) => (
                <th key={column.key} className="border border-slate-300 bg-slate-100 px-3 py-3">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.year} className={row.year === 'Total' ? 'bg-slate-100 font-extrabold' : 'bg-white'}>
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-900">{row.year}</td>
                {annualReturnColumns.map((column) => (
                  <td key={column.key} className="border border-slate-300 bg-emerald-50 px-3 py-2 font-semibold text-slate-900">
                    {formatFlexibleNumber(row[column.key])}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={annualReturnColumns.length + 1} className="border border-slate-300 px-3 py-6 text-sm font-bold text-slate-500">
                  Upload Pre/Post data with Year and Material Type columns to view annual return totals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EprTargetSummaryTable({ baseRows, portalRows }) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h5 className="text-sm font-extrabold text-slate-950">EPR Target Calculation</h5>
        <p className="text-xs font-semibold text-slate-500">
          Producer post-consumer values use EPR Target Data / Total Plastic Qty (Tons). Pre-consumer values use EPR Target Portal Upload / Pre Consumer Waste Plastic Quantity (TPA).
        </p>
      </div>
      <EprTargetYearTable
        title="Target Calculation for 2025-26 (Producer)"
        baseRows={baseRows}
        portalRows={portalRows}
        firstYear="2023-24"
        secondYear="2024-25"
        targetYear="2025-26"
      />
      <EprTargetYearTable
        title="Target Calculation for 2026-27 (Producer)"
        baseRows={baseRows}
        portalRows={portalRows}
        firstYear="2024-25"
        secondYear="2025-26"
        targetYear="2026-27"
      />
    </section>
  );
}

function EprTargetYearTable({ title, baseRows, portalRows, firstYear, secondYear, targetYear }) {
  const summary = buildEprTargetSummary(baseRows, portalRows, { firstYear, secondYear });

  return (
    <div className="m-4 overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
        <h6 className="text-xs font-extrabold text-slate-800">{title}</h6>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[1280px] border-collapse text-center text-sm">
          <thead>
            <tr>
              <th rowSpan="2" className="border border-slate-300 bg-slate-800 px-3 py-3 text-left text-white">Category of Plastic</th>
              <th colSpan="3" className="border border-slate-300 bg-emerald-100 px-3 py-2 text-emerald-950">{firstYear}</th>
              <th colSpan="3" className="border border-slate-300 bg-emerald-100 px-3 py-2 text-emerald-950">{secondYear}</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-100 px-3 py-3 text-emerald-950">Avg</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-100 px-3 py-3 text-emerald-950">Registered Sales ({secondYear})</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-100 px-3 py-3 text-emerald-950">Recycled Plastic % ({secondYear})</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-100 px-3 py-3 text-emerald-950">Recycled Qty</th>
              <th rowSpan="2" className="border border-slate-300 bg-emerald-100 px-3 py-3 text-emerald-950">Target of Virgin {targetYear}</th>
            </tr>
            <tr className="text-xs text-emerald-950">
              {['Post Consumer', 'Pre Consumer', 'Total', 'Post Consumer', 'Pre Consumer', 'Total'].map((header, index) => (
                <th key={`${header}-${index}`} className="border border-slate-300 bg-emerald-100 px-3 py-2">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.category} className="bg-white">
                <td className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-bold text-slate-900">{row.category}</td>
                <EprTargetCell value={row.year2023.postConsumer} />
                <EprTargetCell value={row.year2023.preConsumer} />
                <EprTargetCell value={row.year2023.total} />
                <EprTargetCell value={row.year2024.postConsumer} />
                <EprTargetCell value={row.year2024.preConsumer} />
                <EprTargetCell value={row.year2024.total} />
                <EprTargetCell value={row.avg} />
                <EprTargetCell value={row.registeredSales} />
                <EprTargetCell value={row.recycledPercentDisplay} />
                <EprTargetCell value={row.recycledQty} />
                <EprTargetCell value={row.targetVirgin} highlight />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EprTargetCell({ value, highlight = false }) {
  return (
    <td className={`border border-slate-300 px-3 py-2 font-semibold ${highlight ? 'bg-blue-50 text-blue-700' : 'text-slate-800'}`}>
      {formatFlexibleNumber(value)}
    </td>
  );
}

function EprCreditSummaryTable({ rows, savedSummary }) {
  const hasSavedSummary = Boolean(savedSummary?.rows?.length);
  const summary = hasSavedSummary ? savedSummary : buildEprCreditSummary(rows);
  const processingGroups = [
    { key: 'recycling', label: 'Recycling' },
    { key: 'eol', label: 'EOL' },
  ];
  const categories = ['Cat-I', 'Cat-II', 'Cat-III'];

  if (!rows.length) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-[22px] border border-emerald-100 bg-white shadow-[0_18px_45px_-30px_rgba(15,118,110,0.35)]">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white px-5 py-4">
        <h5 className="text-sm font-extrabold text-slate-950">EPR Credit Summary</h5>
        <p className="text-xs font-semibold text-slate-500">
          Grouped by Processing Type and Category. Available credit = Denomination x category count.
        </p>
      </div>
      <div className="overflow-x-auto bg-white p-4">
        <table className="w-full min-w-[1420px] overflow-hidden rounded-[18px] border-separate border-spacing-0 text-right text-sm shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)] ring-1 ring-emerald-100">
          <thead>
            <tr>
              <th rowSpan="2" className="border-b border-r border-emerald-200 bg-[#0f5f57] px-4 py-4 text-center text-sm font-black tracking-[0.04em] text-white">
                Denomination
              </th>
              {processingGroups.map((group) => (
                <th
                  key={group.key}
                  colSpan={categories.length * 2}
                  className="border-b border-r border-emerald-200 bg-[#0f5f57] px-4 py-4 text-center text-sm font-black uppercase tracking-[0.08em] text-white last:border-r-0"
                >
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {processingGroups.flatMap((group) => categories.flatMap((category) => [
                <th
                  key={`${group.key}-${category}`}
                  className="border-b border-r border-emerald-200 bg-emerald-100/80 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.08em] text-emerald-950"
                >
                  {category.replace('-', ' ')}
                </th>,
                <th
                  key={`${group.key}-${category}-credit`}
                  className="border-b border-r border-emerald-200 bg-emerald-100/80 px-3 py-3 text-center text-xs font-black uppercase tracking-[0.08em] text-emerald-950"
                >
                  Available {category.replace('-', ' ')} Credit
                </th>,
              ]))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row, index) => (
              <tr key={row.denomination} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30'}>
                <td className="border-b border-r border-emerald-100 px-4 py-3 text-left font-bold text-slate-900">
                  {row.denomination}
                </td>
                {processingGroups.flatMap((group) => categories.flatMap((category) => {
                  const cell = row[group.key][category];
                  return [
                    <td
                      key={`${group.key}-${category}-count-${row.denomination}`}
                      className="border-b border-r border-emerald-100 px-3 py-3 font-semibold text-slate-800"
                    >
                      {cell.count || ''}
                    </td>,
                    <td
                      key={`${group.key}-${category}-credit-${row.denomination}`}
                      className="border-b border-r border-emerald-100 px-3 py-3 font-semibold text-slate-900"
                    >
                      {formatFlexibleNumber(cell.credit)}
                    </td>,
                  ];
                }))}
              </tr>
            ))}
            <tr className="bg-[#f7f3eb]">
              <td className="border-r border-t border-emerald-200 px-4 py-3 text-left font-extrabold text-slate-950">Total</td>
              {processingGroups.flatMap((group) => categories.flatMap((category) => [
                <td key={`${group.key}-${category}-total-count`} className="border-r border-t border-emerald-200 px-3 py-3" />,
                <td key={`${group.key}-${category}-total-credit`} className="border-r border-t border-emerald-200 px-3 py-3 font-extrabold text-slate-950">
                  {formatFlexibleNumber(summary.totals[group.key][category])}
                </td>,
              ]))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCell({ value, tone }) {
  return (
    <td className={`border border-slate-300 px-3 py-2 font-semibold ${tone === 'green' ? 'bg-emerald-50 text-slate-900' : 'bg-orange-50 text-slate-900'}`}>
      {formatNumber(value)}
    </td>
  );
}

function SectionImageUploadBox({ images, saving, onUpload, onRemove }) {
  const [previewFile, setPreviewFile] = useState(null);

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h5 className="text-sm font-extrabold text-slate-950">Upload Images</h5>
          <p className="mt-1 text-xs font-semibold text-slate-500">Upload supporting screenshots or portal images for this data upload.</p>
        </div>
        {saving ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Saving...</span> : null}
      </div>

      <label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white p-5 text-center transition hover:bg-emerald-50">
        <ImagePlus className="h-8 w-8 text-emerald-700" />
        <span className="mt-3 text-sm font-extrabold text-slate-950">Upload Image</span>
        <span className="mt-1 text-xs font-semibold text-slate-500">Accepted: PNG, JPG, JPEG</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={saving}
          onChange={(event) => {
            onUpload(event.target.files);
            event.target.value = '';
          }}
        />
      </label>

      {images.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <article key={`${image.name || 'image'}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button type="button" onClick={() => setPreviewFile(image)} className="block aspect-video w-full bg-slate-100">
                <img src={image.dataUrl} alt={image.name || `Uploaded image ${index + 1}`} className="h-full w-full object-cover" />
              </button>
              <div className="space-y-3 p-3">
                <p className="truncate text-sm font-extrabold text-slate-950">{image.name || `Uploaded image ${index + 1}`}</p>
                <p className="text-xs font-semibold text-slate-500">Uploaded {formatDate(image.uploadedAt)}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPreviewFile(image)} className="admin-secondary-button min-h-9 flex-1 justify-center px-3 text-xs">
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={saving}
                    className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">No images uploaded.</p>
      )}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </section>
  );
}

function ExcelUploadBox({ title, description, file, saving, readOnly = false, locked = false, onUpload, onRemove }) {
  const hasFile = Boolean(file?.dataUrl);
  const disabled = readOnly || locked;
  const rowCount = Array.isArray(file?.rows) ? file.rows.length : null;

  return (
    <article className={`rounded-2xl border p-4 ${locked ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-extrabold text-slate-950">{title}</h5>
          <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </div>
        {saving ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Saving...</span> : null}
      </div>

      {!disabled ? (
        <label className="mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-white p-5 text-center transition hover:bg-emerald-50">
          <FileText className="h-8 w-8 text-emerald-700" />
          <span className="mt-3 text-sm font-extrabold text-slate-950">Upload Excel</span>
          <span className="mt-1 text-xs font-semibold text-slate-500">Accepted: .xlsx, .xls, .csv</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            disabled={saving}
            onChange={(event) => {
              onUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      ) : (
        <div className={`mt-4 flex min-h-24 flex-col items-center justify-center rounded-xl border bg-white p-5 text-center ${locked ? 'border-amber-200' : 'border-slate-200'}`}>
          <FileText className={`h-7 w-7 ${locked ? 'text-amber-600' : 'text-slate-500'}`} />
          <span className="mt-2 text-sm font-extrabold text-slate-800">
            {locked ? 'Upload locked' : 'Excel download only'}
          </span>
          <span className="mt-1 text-xs font-semibold text-slate-500">
            {locked ? 'Select Yes in Upload Complete above to enable this box.' : 'Excel upload is disabled for your current access.'}
          </span>
        </div>
      )}

      {hasFile ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <p className="truncate text-sm font-extrabold text-slate-950">{file.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
            <span>Uploaded {formatDate(file.uploadedAt)}</span>
            {rowCount !== null ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                Rows: {rowCount}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2">
            <a href={file.dataUrl} download={file.name} className="admin-secondary-button min-h-9 flex-1 justify-center px-3 text-xs">
              Download
            </a>
            {!disabled ? (
              <button type="button" onClick={onRemove} disabled={saving} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-slate-500">No file uploaded.</p>
      )}
    </article>
  );
}

function isPurchaseUploadUnlocked(rows) {
  const normalizedRows = normalizePurchaseProgressRows(rows);
  return normalizedRows.some((row) => row.particular === 'Upload Complete' && row.yesNo === 'Yes');
}

const purchaseCategories = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV'];
const eprTargetCategories = ['Cat-I', 'Cat-II', 'Cat-III', 'Cat-IV', 'Cat-V'];
const annualReturnColumns = [
  { key: 'rigidPlastic', label: 'Rigid Plastic (Cat-I)' },
  { key: 'flexiblePlastic', label: 'Flexible Plastic (Cat-II)' },
  { key: 'mlp', label: 'MLP (Cat-III)' },
  { key: 'compostablePlastic', label: 'Compostable Plastic (Cat-IV)' },
];

function buildPrePostSummary(purchaseRows, prePostRows) {
  const emptyRow = (category) => ({
    category,
    totalPurchase: 0,
    preConsumer: 0,
    postConsumer: 0,
    exportValue: 0,
    totalConsumption: 0,
  });

  const summaryMap = purchaseCategories.reduce((map, category) => ({
    ...map,
    [category]: emptyRow(category),
  }), {});

  purchaseRows.forEach((row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Category']));
    if (!summaryMap[category]) return;
    summaryMap[category].totalPurchase += readNumber(row, ['Total Plastic Qty (Tons)', 'Total Plastic Qty (Ton)', 'Total Plastic Qty']);
  });

  prePostRows.forEach((row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Category']));
    if (!summaryMap[category]) return;

    summaryMap[category].preConsumer += multiplyQuantityByPercent(
      row,
      ['Pre Consumer Waste Plastic Quantity (TPA)', 'Pre Consumer Quantity (TPA)', 'Pre Consumer Waste Plastic Quantity'],
      ['Pre Consumer Waste Recycled Plastic %', 'Pre Consumer Recycled Plastic %', 'Pre Consumer Waste Recycled %'],
    );
    summaryMap[category].postConsumer += multiplyQuantityByPercent(
      row,
      ['Post Consumer Waste Plastic Quantity (TPA)', 'Post Consumer Quantity (TPA)', 'Post Consumer Waste Plastic Quantity'],
      ['Post Consumer Waste Recycled Plastic %', 'Post Consumer Recycled Plastic %', 'Post Consumer Waste Recycled %'],
    );
    summaryMap[category].exportValue += multiplyQuantityByPercent(
      row,
      ['Export Quantity Plastic Quantity (TPA)', 'Export Quantity (TPA)', 'Export Plastic Quantity (TPA)'],
      ['Export Quantity Recycled Plastic %', 'Export Recycled Plastic %', 'Export Quantity Recycled %'],
    );
  });

  const rows = purchaseCategories.map((category) => {
    const row = summaryMap[category];
    row.totalConsumption = row.preConsumer + row.postConsumer + row.exportValue;
    return row;
  });

  const total = rows.reduce((acc, row) => {
    acc.totalPurchase += row.totalPurchase;
    acc.preConsumer += row.preConsumer;
    acc.postConsumer += row.postConsumer;
    acc.exportValue += row.exportValue;
    acc.totalConsumption += row.totalConsumption;
    return acc;
  }, emptyRow('Total'));

  return [...rows, total];
}

function buildStateWisePrePostSummary(prePostRows) {
  const summaryMap = new Map();

  prePostRows.forEach((row) => {
    const state = String(readField(row, ['State Name', 'State', 'State/UT', 'State UT', 'State / UT']) || '').trim();
    if (!state) return;

    const key = state.toLowerCase().replace(/\s+/g, ' ');
    const current = summaryMap.get(key) || {
      key,
      state,
      preConsumer: 0,
      postConsumer: 0,
      exportValue: 0,
      total: 0,
      categoryMap: new Map(),
    };

    const preConsumer = readQuantityOrWeightedValue(
      row,
      ['Pre Consumer Waste Plastic Quantity (TPA)', 'Pre Consumer Quantity (TPA)', 'Pre Consumer Waste Plastic Quantity', 'Pre Consumer'],
      ['Pre Consumer Waste Recycled Plastic %', 'Pre Consumer Recycled Plastic %', 'Pre Consumer Waste Recycled %'],
    );
    const postConsumer = readQuantityOrWeightedValue(
      row,
      ['Post Consumer Waste Plastic Quantity (TPA)', 'Post Consumer Quantity (TPA)', 'Post Consumer Waste Plastic Quantity', 'Post Consumer'],
      ['Post Consumer Waste Recycled Plastic %', 'Post Consumer Recycled Plastic %', 'Post Consumer Waste Recycled %'],
    );
    const exportValue = readQuantityOrWeightedValue(
      row,
      ['Export Quantity Plastic Quantity (TPA)', 'Export Quantity (TPA)', 'Export Plastic Quantity (TPA)', 'Export'],
      ['Export Quantity Recycled Plastic %', 'Export Recycled Plastic %', 'Export Quantity Recycled %'],
    );
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Plastic Category', 'Category'])) || 'Not specified';
    const categoryRow = current.categoryMap.get(category) || {
      category,
      preConsumer: 0,
      postConsumer: 0,
      exportValue: 0,
      total: 0,
    };

    current.preConsumer += preConsumer;
    current.postConsumer += postConsumer;
    current.exportValue += exportValue;
    current.total = current.preConsumer + current.postConsumer + current.exportValue;
    categoryRow.preConsumer += preConsumer;
    categoryRow.postConsumer += postConsumer;
    categoryRow.exportValue += exportValue;
    categoryRow.total = categoryRow.preConsumer + categoryRow.postConsumer + categoryRow.exportValue;
    current.categoryMap.set(category, categoryRow);
    summaryMap.set(key, current);
  });

  const rows = Array.from(summaryMap.values())
    .map(({ categoryMap, ...row }) => ({
      ...row,
      categories: Array.from(categoryMap.values()).sort((first, second) => (
        (purchaseCategories.indexOf(first.category) === -1 ? Number.MAX_SAFE_INTEGER : purchaseCategories.indexOf(first.category))
        - (purchaseCategories.indexOf(second.category) === -1 ? Number.MAX_SAFE_INTEGER : purchaseCategories.indexOf(second.category))
        || first.category.localeCompare(second.category)
      )),
    }))
    .sort((first, second) => first.state.localeCompare(second.state));
  if (!rows.length) return [];

  const total = rows.reduce((acc, row) => {
    acc.preConsumer += row.preConsumer;
    acc.postConsumer += row.postConsumer;
    acc.exportValue += row.exportValue;
    acc.total += row.total;
    return acc;
  }, {
    key: 'total',
    state: 'Total',
    preConsumer: 0,
    postConsumer: 0,
    exportValue: 0,
    total: 0,
    categories: [],
  });

  return [...rows, total];
}

function buildAnnualReturnSummary(prePostRows) {
  const summaryMap = new Map();

  prePostRows.forEach((row) => {
    const year = normalizeFinancialYear(readField(row, ['Year', 'Financial Year', 'FY']));
    const materialKey = normalizeAnnualReturnMaterial(readField(row, ['Material Type', 'Material type', 'Material']));
    if (!year || !materialKey) return;

    const current = summaryMap.get(year) || annualReturnColumns.reduce((acc, column) => ({
      ...acc,
      [column.key]: 0,
    }), { year });

    current[materialKey] += readPrePostTotal(row);
    summaryMap.set(year, current);
  });

  const rows = Array.from(summaryMap.values()).sort((first, second) => first.year.localeCompare(second.year));
  if (!rows.length) return [];

  const total = rows.reduce((acc, row) => {
    annualReturnColumns.forEach((column) => {
      acc[column.key] += row[column.key] || 0;
    });
    return acc;
  }, annualReturnColumns.reduce((acc, column) => ({
    ...acc,
    [column.key]: 0,
  }), { year: 'Total' }));

  return [...rows, total];
}

function buildEprTargetSummary(baseRows, portalRows, { firstYear, secondYear }) {
  const emptyYear = () => ({ postConsumer: 0, preConsumer: 0, total: 0 });
  const emptyRow = (category) => ({
    category,
    yearData: {
      [firstYear]: emptyYear(),
      [secondYear]: emptyYear(),
    },
    registeredSalesByYear: {
      [firstYear]: 0,
      [secondYear]: 0,
    },
    recycledPercentByYear: {
      [firstYear]: { quantity: 0, weightedPercent: 0 },
      [secondYear]: { quantity: 0, weightedPercent: 0 },
    },
  });

  const summaryMap = eprTargetCategories.reduce((map, category) => ({
    ...map,
    [category]: emptyRow(category),
  }), {});

  baseRows.forEach((row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Plastic Category', 'Category']));
    const year = normalizeFinancialYear(readField(row, ['Financial Year', 'Year', 'FY']));
    if (!summaryMap[category]?.yearData[year]) return;

    const quantity = readNumber(row, ['Total Plastic Qty (Tons)', 'Total Plastic Qty (Ton)', 'Total Plastic Qty']);
    const recycledPercent = normalizePercent(readField(row, ['Recycled Plastic %', 'Recycled Plastic Percentage']));

    summaryMap[category].yearData[year].postConsumer += quantity;
    if (isRegisteredEprSale(row)) summaryMap[category].registeredSalesByYear[year] += quantity;
    summaryMap[category].recycledPercentByYear[year].quantity += quantity;
    summaryMap[category].recycledPercentByYear[year].weightedPercent += quantity * recycledPercent;
  });

  portalRows.forEach((row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Plastic Category', 'Category']));
    const year = normalizeFinancialYear(readField(row, ['Year', 'Financial Year', 'FY']));
    if (!summaryMap[category]?.yearData[year]) return;

    summaryMap[category].yearData[year].preConsumer += readNumber(row, [
      'Pre Consumer Waste Plastic Quantity (TPA)',
      'Pre Consumer Quantity (TPA)',
      'Pre Consumer Waste Plastic Quantity',
    ]);
  });

  return eprTargetCategories.map((category) => {
    const row = summaryMap[category];
    const year2023 = row.yearData[firstYear];
    const year2024 = row.yearData[secondYear];

    year2023.total = year2023.postConsumer + year2023.preConsumer;
    year2024.total = year2024.postConsumer + year2024.preConsumer;

    const avg = (year2023.total + year2024.total) / 2;
    const recycledPercentBucket = row.recycledPercentByYear[secondYear];
    const recycledPercent = recycledPercentBucket.quantity
      ? recycledPercentBucket.weightedPercent / recycledPercentBucket.quantity
      : 0;
    const registeredSales = readExplicitRegisteredSales(baseRows, category, secondYear)
      || row.registeredSalesByYear[secondYear];
    const recycledQty = avg * recycledPercent;

    return {
      category,
      year2023,
      year2024,
      avg,
      registeredSales,
      recycledPercentDisplay: recycledPercent * 100,
      recycledQty,
      targetVirgin: avg - registeredSales - recycledQty,
    };
  });
}

function buildEprCreditSummary(rows = []) {
  const denominations = [1, 10, 50, 100, 500, 1000];
  const processingGroups = ['recycling', 'eol'];
  const categories = ['Cat-I', 'Cat-II', 'Cat-III'];
  const emptyCategoryCells = () => categories.reduce((acc, category) => ({
    ...acc,
    [category]: { count: 0, credit: 0 },
  }), {});
  const emptyProcessingCells = () => processingGroups.reduce((acc, processing) => ({
    ...acc,
    [processing]: emptyCategoryCells(),
  }), {});

  const rowMap = new Map(denominations.map((denomination) => [
    denomination,
    { denomination, ...emptyProcessingCells() },
  ]));

  rows.forEach((row) => {
    const denomination = readEprCreditDenomination(row);
    const processing = normalizeEprCreditProcessingType(readField(row, [
      'Processing Type',
      'Processing Typ',
      'Processing',
      'Type',
    ]));
    const category = normalizeCategory(readField(row, ['Category', 'Plastic Category', 'Category of Plastic']));
    const summaryRow = rowMap.get(denomination);

    if (!summaryRow || !processing || !categories.includes(category)) return;

    summaryRow[processing][category].count += 1;
    summaryRow[processing][category].credit += denomination;
  });

  const summaryRows = denominations.map((denomination) => rowMap.get(denomination));
  const totals = processingGroups.reduce((acc, processing) => ({
    ...acc,
    [processing]: categories.reduce((categoryTotals, category) => ({
      ...categoryTotals,
      [category]: summaryRows.reduce((total, row) => total + row[processing][category].credit, 0),
    }), {}),
  }), {});

  return { rows: summaryRows, totals };
}

function buildPurchaseSummary(baseRows, portalRows, options = {}) {
  const { requireCompletedPortalRows = false } = options;
  const emptyBucket = () => ({
    baseQty: 0,
    portalQty: 0,
    qtyDiff: 0,
    baseGst: 0,
    portalGst: 0,
    gstDiff: 0,
  });

  const summaryMap = purchaseCategories.reduce((map, category) => ({
    ...map,
    [category]: {
      category,
      registered: emptyBucket(),
      unregistered: emptyBucket(),
    },
  }), {});

  const addBaseRow = (row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Category']));
    if (!summaryMap[category]) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    summaryMap[category][group].baseQty += readNumber(row, ['Quantity (TPA)']);
    summaryMap[category][group].baseGst += readNumber(row, ['GST Paid', 'GST']);
  };

  const addPortalRow = (row) => {
    if (requireCompletedPortalRows && !isCompletedUploadStatus(row)) return;
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Category']));
    if (!summaryMap[category]) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    summaryMap[category][group].portalQty += readNumber(row, ['Total Plastic Qty (Tons)', 'Total Plastic Qty (Ton)', 'Total Plastic Qty']);
    summaryMap[category][group].portalGst += readNumber(row, ['GST Paid', 'GST']);
  };

  baseRows.forEach(addBaseRow);
  portalRows.forEach(addPortalRow);

  const rows = purchaseCategories.map((category) => {
    const row = summaryMap[category];
    ['registered', 'unregistered'].forEach((group) => {
      row[group].qtyDiff = row[group].baseQty - row[group].portalQty;
      row[group].gstDiff = row[group].baseGst - row[group].portalGst;
    });
    return row;
  });

  const total = {
    category: 'Total',
    registered: emptyBucket(),
    unregistered: emptyBucket(),
  };

  rows.forEach((row) => {
    ['registered', 'unregistered'].forEach((group) => {
      Object.keys(total[group]).forEach((key) => {
        total[group][key] += row[group][key];
      });
    });
  });

  return [...rows, total];
}

function buildPurchaseSummaryByMaterial(baseRows, portalRows, options = {}) {
  const { requireCompletedPortalRows = false } = options;
  const emptyBucket = () => ({
    baseQty: 0,
    portalQty: 0,
    qtyDiff: 0,
    baseGst: 0,
    portalGst: 0,
    gstDiff: 0,
  });
  const summaryMap = purchaseCategories.reduce((map, category) => ({ ...map, [category]: {} }), {});
  const materialHeaders = [
    'Plastic Material Type',
    'Type of Plastic Material',
    'Material Type',
    'Plastic Type',
  ];

  const ensureMaterialRow = (row) => {
    const category = normalizeCategory(readField(row, ['Category of Plastic', 'Category of Plastic Type', 'Category']));
    if (!summaryMap[category]) return null;
    const rawMaterialType = String(readField(row, materialHeaders) || '').trim();
    if (!rawMaterialType) return null;
    const materialKey = normalizeHeader(rawMaterialType);
    if (!materialKey) return null;
    if (!summaryMap[category][materialKey]) {
      summaryMap[category][materialKey] = {
        category,
        materialKey,
        materialType: rawMaterialType,
        registered: emptyBucket(),
        unregistered: emptyBucket(),
      };
    }
    return summaryMap[category][materialKey];
  };

  baseRows.forEach((row) => {
    const materialRow = ensureMaterialRow(row);
    if (!materialRow) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    materialRow[group].baseQty += readNumber(row, ['Quantity (TPA)']);
    materialRow[group].baseGst += readNumber(row, ['GST Paid', 'GST']);
  });

  portalRows.forEach((row) => {
    if (requireCompletedPortalRows && !isCompletedUploadStatus(row)) return;
    const materialRow = ensureMaterialRow(row);
    if (!materialRow) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    materialRow[group].portalQty += readNumber(row, ['Total Plastic Qty (Tons)', 'Total Plastic Qty (Ton)', 'Total Plastic Qty']);
    materialRow[group].portalGst += readNumber(row, ['GST Paid', 'GST']);
  });

  return purchaseCategories.reduce((result, category) => {
    result[category] = Object.values(summaryMap[category])
      .map((row) => {
        ['registered', 'unregistered'].forEach((group) => {
          row[group].qtyDiff = row[group].baseQty - row[group].portalQty;
          row[group].gstDiff = row[group].baseGst - row[group].portalGst;
        });
        return row;
      })
      .sort((first, second) => first.materialType.localeCompare(second.materialType));
    return result;
  }, {});
}

function buildPurchaseSummaryByEntity(baseRows, portalRows, options = {}) {
  const { requireCompletedPortalRows = false } = options;
  const emptyBucket = () => ({
    baseQty: 0,
    portalQty: 0,
    qtyDiff: 0,
    baseGst: 0,
    portalGst: 0,
    gstDiff: 0,
  });
  const summaryMap = {};
  const entityLabels = ['Name of Entity', 'Entity Name', 'Name of the Entity'];

  const ensureRow = (entity) => {
    const entityKey = normalizeEntityName(entity);
    if (!entityKey) return null;

    if (!summaryMap[entityKey]) {
      summaryMap[entityKey] = {
        category: entity,
        hasBaseEntity: false,
        hasPortalEntity: false,
        registered: emptyBucket(),
        unregistered: emptyBucket(),
      };
    }
    return summaryMap[entityKey];
  };

  const addBaseRow = (row) => {
    const entity = String(readField(row, entityLabels) || '').trim();
    if (!entity) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    const summaryRow = ensureRow(entity);
    if (!summaryRow) return;
    summaryRow.hasBaseEntity = true;
    summaryRow[group].baseQty += readNumber(row, ['Quantity (TPA)']);
    summaryRow[group].baseGst += readNumber(row, ['GST Paid', 'GST']);
  };

  const addPortalRow = (row) => {
    if (requireCompletedPortalRows && !isCompletedUploadStatus(row)) return;
    const entity = String(readField(row, entityLabels) || '').trim();
    if (!entity) return;
    const group = isUnregistered(row) ? 'unregistered' : 'registered';
    const summaryRow = ensureRow(entity);
    if (!summaryRow) return;
    summaryRow.hasPortalEntity = true;
    summaryRow[group].portalQty += readNumber(row, ['Total Plastic Qty (Tons)', 'Total Plastic Qty (Ton)', 'Total Plastic Qty']);
    summaryRow[group].portalGst += readNumber(row, ['GST Paid', 'GST']);
  };

  baseRows.forEach(addBaseRow);
  portalRows.forEach(addPortalRow);

  const rows = Object.values(summaryMap)
    .sort((first, second) => first.category.localeCompare(second.category))
    .map((row) => {
      ['registered', 'unregistered'].forEach((group) => {
        row[group].qtyDiff = row[group].baseQty - row[group].portalQty;
        row[group].gstDiff = row[group].baseGst - row[group].portalGst;
      });
      return row;
    });

  const total = {
    category: 'Total',
    registered: emptyBucket(),
    unregistered: emptyBucket(),
  };

  rows.forEach((row) => {
    ['registered', 'unregistered'].forEach((group) => {
      Object.keys(total[group]).forEach((key) => {
        total[group][key] += row[group][key];
      });
    });
  });

  return [...rows, total];
}

function hasSummaryValues(bucket) {
  return ['baseQty', 'portalQty', 'baseGst', 'portalGst'].some((key) => Math.abs(bucket?.[key] || 0) > 0);
}

function isUnmatchedEntity(row) {
  return Boolean(row?.hasBaseEntity) !== Boolean(row?.hasPortalEntity);
}

function buildEntityGroupTotal(rows, group) {
  return rows.reduce((total, row) => {
    Object.keys(total).forEach((key) => {
      total[key] += row[group]?.[key] || 0;
    });
    return total;
  }, {
    baseQty: 0,
    portalQty: 0,
    qtyDiff: 0,
    baseGst: 0,
    portalGst: 0,
    gstDiff: 0,
  });
}

function normalizeEntityName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function readField(row, labels) {
  const normalizedLabels = labels.map(normalizeHeader);
  const entry = Object.entries(row || {}).find(([key]) => {
    const normalizedKey = normalizeHeader(key);
    return normalizedLabels.some((label) => (
      normalizedKey === label
      || normalizedKey.startsWith(label)
      || label.startsWith(normalizedKey)
    ));
  });
  return entry?.[1] ?? '';
}

function readNumber(row, labels) {
  const rawValue = readField(row, labels);
  if (typeof rawValue === 'number') return rawValue;
  const cleaned = String(rawValue || '').replace(/,/g, '').replace(/%/g, '').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function multiplyQuantityByPercent(row, quantityLabels, percentLabels) {
  const quantity = readNumber(row, quantityLabels);
  const percent = normalizePercent(readField(row, percentLabels));
  return quantity * percent;
}

function readQuantityOrWeightedValue(row, quantityLabels, percentLabels) {
  const percentValue = readField(row, percentLabels);
  if (percentValue === null || percentValue === undefined || String(percentValue).trim() === '') {
    return readNumber(row, quantityLabels);
  }
  return multiplyQuantityByPercent(row, quantityLabels, percentLabels);
}

function readPrePostTotal(row) {
  const preConsumer = readQuantityOrWeightedValue(
    row,
    ['Pre Consumer Waste Plastic Quantity (TPA)', 'Pre Consumer Quantity (TPA)', 'Pre Consumer Waste Plastic Quantity', 'Pre Consumer'],
    ['Pre Consumer Waste Recycled Plastic %', 'Pre Consumer Recycled Plastic %', 'Pre Consumer Waste Recycled %'],
  );
  const postConsumer = readQuantityOrWeightedValue(
    row,
    ['Post Consumer Waste Plastic Quantity (TPA)', 'Post Consumer Quantity (TPA)', 'Post Consumer Waste Plastic Quantity', 'Post Consumer'],
    ['Post Consumer Waste Recycled Plastic %', 'Post Consumer Recycled Plastic %', 'Post Consumer Waste Recycled %'],
  );
  const exportValue = readQuantityOrWeightedValue(
    row,
    ['Export Quantity Plastic Quantity (TPA)', 'Export Quantity (TPA)', 'Export Plastic Quantity (TPA)', 'Export'],
    ['Export Quantity Recycled Plastic %', 'Export Recycled Plastic %', 'Export Quantity Recycled %'],
  );
  return preConsumer + postConsumer + exportValue;
}

function normalizeAnnualReturnMaterial(value) {
  const material = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!material) return '';
  if (material.includes('rigid')) return 'rigidPlastic';
  if (material.includes('flexible')) return 'flexiblePlastic';
  if (material.includes('mlp') || material.includes('multi layer')) return 'mlp';
  if (material.includes('compostable') || material.includes('compost')) return 'compostablePlastic';
  return '';
}

function normalizePercent(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = typeof value === 'number'
    ? value
    : Number.parseFloat(String(value).replace(/,/g, '').replace(/%/g, '').trim());
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCategory(value) {
  const rawValue = String(value || '').trim().toLowerCase();
  const spacedValue = rawValue
    .replace(/[_/]+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ');
  const spacedMatch = spacedValue.match(/\bcat(?:egory)?\s*-?\s*(v|iv|iii|ii|i|5|4|3|2|1)\b/i);
  const compactValue = rawValue.replace(/[^a-z0-9]/g, '');
  const compactMatch = compactValue.match(/^(?:cat|category)(v|iv|iii|ii|i|5|4|3|2|1)/i);
  const exactMatch = compactValue.match(/^(v|iv|iii|ii|i|5|4|3|2|1)$/i);
  const category = spacedMatch?.[1] || compactMatch?.[1] || exactMatch?.[1] || '';

  if (category === 'i' || category === '1') return 'Cat-I';
  if (category === 'ii' || category === '2') return 'Cat-II';
  if (category === 'iii' || category === '3') return 'Cat-III';
  if (category === 'iv' || category === '4') return 'Cat-IV';
  if (category === 'v' || category === '5') return 'Cat-V';
  return '';
}

function normalizeEprCreditProcessingType(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.includes('recycl')) return 'recycling';
  if (normalized === 'eol' || normalized.includes('end of life') || normalized.includes('endoflife')) return 'eol';
  return '';
}

function readEprCreditDenomination(row) {
  const value = readNumber(row, ['Denomination', 'Value', 'Credit Value']);
  return Number.isFinite(value) ? value : 0;
}

function isUnregistered(row) {
  const value = [
    readField(row, ['Registration Type']),
    readField(row, ['Entity Type']),
  ].join(' ').toLowerCase();
  return value.includes('unregistered') || value.includes('un register');
}

function isRegisteredEprSale(row) {
  const value = [
    readField(row, ['Registration Type']),
    readField(row, ['Entity Type']),
  ].join(' ').toLowerCase();

  if (value.includes('unregistered') || value.includes('un register')) return false;
  return value.includes('registered') || value.includes('producer') || value.includes('brand owner');
}

function readExplicitRegisteredSales(rows, category, year) {
  return rows.reduce((total, row) => {
    const rowCategory = normalizeCategory(readField(row, ['Category of Plastic', 'Plastic Category', 'Category']));
    const rowYear = normalizeFinancialYear(readField(row, ['Financial Year', 'Year', 'FY']));
    if (rowCategory !== category || rowYear !== year) return total;
    return total + readNumber(row, [
      `Registered Sales (${year})`,
      'Registered Sales',
      'Registered Sale',
      'Registered Sales Qty',
    ]);
  }, 0);
}

function isCompletedUploadStatus(row) {
  const status = String(readField(row, ['Upload Status', 'Uploaded Status', 'Status']) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return status === 'completed' || status === 'complete';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatFlexibleNumber(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(safeValue);
}

function formatDifference(totalPurchase, totalConsumption) {
  if (!totalPurchase) return '#DIV/0!';
  const difference = ((totalConsumption - totalPurchase) / totalPurchase) * 100;
  return `${Math.round(difference)}%`;
}

function GroupedDataBlock({ section }) {
  const { title, Icon, value } = section;
  const rows = normalizeRows(value);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {rows.length ? `${rows.length} records` : 'No data'}
        </span>
      </div>
      <div>
        {Array.isArray(value) ? (
          <DataTable rows={value} />
        ) : value && typeof value === 'object' ? (
          <div className="grid gap-x-8 gap-y-0 lg:grid-cols-2">
            {Object.entries(value).map(([key, entry]) => (
              <OverviewField key={key} label={`${formatLabel(key)}:`} value={entry} />
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">-</p>
        )}
      </div>
    </section>
  );
}

function Detail({ icon, label, value, link = false }) {
  return (
    <div className="grid min-w-0 gap-1 py-3 md:grid-cols-[140px_minmax(0,1fr)] md:gap-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}:
      </p>
      <div className="break-words text-sm font-semibold leading-6 text-slate-950">
        {link && value && value !== 'N/A' ? <ExternalValue value={value} /> : <SmartValue value={value} />}
      </div>
    </div>
  );
}

function SnapshotBadge({ label, value }) {
  return (
    <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 shadow-sm shadow-emerald-100/50">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{label}</p>
      <p className="text-xs font-black text-slate-950">{value || '-'}</p>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        <SmartValue value={value} />
      </div>
    </div>
  );
}

function DataTable({ rows }) {
  if (!rows?.length) return <p className="text-sm font-semibold text-slate-500">-</p>;
  const headers = Array.from(rows.reduce((set, row) => {
    if (row && typeof row === 'object' && !Array.isArray(row)) Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  if (!headers.length) {
    return <div className="grid gap-2">{rows.map((row, index) => <Field key={index} label={`Item ${index + 1}`} value={row} />)}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2">{formatLabel(header)}</th>)}</tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row, index) => (
            <tr key={row?._id || index} className="transition hover:bg-slate-50">
              {headers.map((header) => (
                <td key={header} className="px-3 py-3 align-top font-medium text-slate-800">
                  <SmartValue value={row?.[header]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SmartValue({ value }) {
  if (value === null || value === undefined || value === '' || value === 'N/A') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') {
    const urls = extractUrls(value);
    if (urls.length > 1) return <MultiExternalValue urls={urls} />;
    if (urls.length === 1) {
      const trimmedValue = value.trim();
      if (isLinkLike(trimmedValue) && normalizeUrl(trimmedValue) === normalizeUrl(urls[0])) {
        return <ExternalValue value={trimmedValue} />;
      }
      return <MultiExternalValue urls={urls} />;
    }
    if (isDateLike(value)) return formatDate(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return '-';
    return (
      <div className="grid gap-2">
        {value.map((entry, index) => (
          <div key={`${entry}-${index}`} className="break-words">
            <SmartValue value={entry} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    if (value.name || value.dataUrl) {
      return <PreviewableFileValue file={value} />;
    }
    return (
      <div className="grid gap-1">
        {Object.entries(value).map(([key, entry]) => (
          <span key={key}><span className="font-bold">{formatLabel(key)}:</span> <SmartValue value={entry} /></span>
        ))}
      </div>
    );
  }
  return String(value);
}

function PreviewableFileValue({ file }) {
  const [previewFile, setPreviewFile] = useState(null);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {file?.name || 'File'}
      {file?.dataUrl ? (
        <button
          type="button"
          onClick={() => setPreviewFile(file)}
          className="inline-flex items-center gap-1 text-emerald-700 underline-offset-2 hover:underline"
        >
          View/Open
        </button>
      ) : null}
      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </span>
  );
}

function ExternalValue({ value, label }) {
  const href = normalizeUrl(value);
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-700 underline-offset-2 hover:underline">
      {label || value}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function MultiExternalValue({ urls }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url, index) => (
        <a
          key={`${url}-${index}`}
          href={normalizeUrl(url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100"
        >
          {getDocumentLabel(url, index)}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

function StatusPill({ label, value }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm">
      <span className="uppercase tracking-[0.12em] text-slate-400">{label}</span>
      <span className="text-slate-950"><SmartValue value={value} /></span>
    </span>
  );
}

function HeaderStatusPill({ label, value: entry }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-sm">
      <span className="uppercase tracking-[0.12em] font-bold text-slate-600">{label}</span>
      <span className="font-bold text-slate-900"><SmartValue value={entry} /></span>
    </span>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
        <ServerCrash className="h-4 w-4" />
        {message}
      </div>
      <button type="button" onClick={onRetry} className="admin-secondary-button justify-center">Retry</button>
    </div>
  );
}

function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.entries(value);
  return [];
}

function hasUploadedFile(file) {
  return Boolean(file?.name || file?.dataUrl || file?.uploadedAt);
}

function normalizePurchaseProgressRows(rows) {
  const rowMap = new Map((Array.isArray(rows) ? rows : []).map((row) => [row?.particular, row]));
  return purchaseProgressParticulars.map((particular) => {
    const row = rowMap.get(particular) || {};
    return {
      particular,
      yesNo: row.yesNo || '',
      date: row.date || '',
      files: Array.isArray(row.files) ? row.files : [],
      remarks: row.remarks || '',
    };
  });
}

function derivePurchaseDatesFromProgressRows(rows) {
  const normalizedRows = normalizePurchaseProgressRows(rows);
  const getDateForParticular = (particular) => (
    normalizedRows.find((row) => row.particular === particular)?.date || ''
  );

  return {
    startDate: getDateForParticular('Received from client'),
    endDate: getDateForParticular('Upload Complete'),
  };
}

async function readPortalUploadFiles(files) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) return [];
  return Promise.all(selectedFiles.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

function getVerificationProgressSteps(purchase = {}) {
  const userSubmitted = hasUploadedFile(purchase?.baseData) && hasUploadedFile(purchase?.portalUpload);
  const managerStatus = purchase?.managerVerificationStatus || '';
  const complianceStatus = purchase?.complianceVerificationStatus || '';
  const managerApproved = managerStatus === 'Approved';
  const managerRejected = managerStatus === 'Rejected';
  const complianceApproved = complianceStatus === 'Approved';
  const complianceRejected = complianceStatus === 'Rejected';

  return [
    {
      label: 'User',
      state: userSubmitted ? 'complete' : 'active',
      caption: userSubmitted ? 'Submitted to manager' : 'Upload pending',
    },
    {
      label: 'Manager',
      state: managerApproved ? 'complete' : managerRejected ? 'rejected' : userSubmitted ? 'active' : 'pending',
      caption: managerApproved
        ? 'Approved'
        : managerRejected
          ? 'Rejected'
          : userSubmitted
            ? 'Waiting approval'
            : 'Not started',
    },
    {
      label: 'Compliance Manager',
      state: complianceApproved ? 'complete' : complianceRejected ? 'rejected' : managerApproved ? 'active' : 'pending',
      caption: complianceApproved
        ? 'Approved'
        : complianceRejected
          ? 'Rejected'
          : managerApproved
            ? 'Waiting approval'
            : 'Not started',
    },
  ];
}

function getUserRoleName(user) {
  const role = String(user?.role || user?.roleName || user?.designation || user?.roleId?.roleName || '').toLowerCase();
  return role.replace(/\s+/g, ' ').trim();
}

function isAdminRole(user) {
  const role = getUserRoleName(user);
  return role === 'admin' || role === 'super admin' || role === 'superadmin';
}

function isComplianceRole(user) {
  const role = getUserRoleName(user);
  return role === 'compliance' || role === 'compliance manager' || role.includes('compliance');
}

function canVerifyPurchaseData(user) {
  const role = getUserRoleName(user);
  return isAdminRole(user) || (role.includes('manager') && !isComplianceRole(user));
}

function canVerifyCompliancePurchaseData(user) {
  return isComplianceRole(user) || isAdminRole(user);
}

function canOnlyDownloadPortalExcel(user) {
  return isComplianceRole(user) && !isAdminRole(user);
}

function countWords(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function limitWords(value, maxWords) {
  const parts = String(value || '').trimStart().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return value;
  return parts.slice(0, maxWords).join(' ');
}

function normalizeReviewThread(purchase, type = 'manager') {
  const isCompliance = type === 'compliance';
  const thread = isCompliance ? purchase?.complianceReviewThread : purchase?.managerReviewThread;
  const status = isCompliance ? purchase?.complianceVerificationStatus : purchase?.managerVerificationStatus;
  const review = isCompliance ? purchase?.complianceReview : purchase?.managerReview;
  const by = isCompliance ? purchase?.complianceVerifiedBy : purchase?.managerVerifiedBy;
  const at = isCompliance ? purchase?.complianceVerifiedAt : purchase?.managerVerifiedAt;

  if (Array.isArray(thread) && thread.length) {
    return thread
      .map((entry) => ({
        decision: entry?.decision || status || 'Review',
        message: String(entry?.message || '').trim(),
        by: entry?.by || by || (isCompliance ? 'Compliance Manager' : 'Manager'),
        at: entry?.at || at,
      }))
      .filter((entry) => entry.message);
  }

  const legacyReview = String(review || '').trim();
  if (!legacyReview) return [];
  return [{
    decision: status || 'Review',
    message: legacyReview,
    by: by || (isCompliance ? 'Compliance Manager' : 'Manager'),
    at,
  }];
}

function normalizeRemarks(value) {
  if (Array.isArray(value)) {
    return value.map((remark) => String(remark || '').trim()).filter(Boolean);
  }

  if (value === null || value === undefined || value === '') return [];
  return [String(value).trim()].filter(Boolean);
}

function getMsmeStatus(data = {}) {
  const directStatus = data?.basic?.msmeStatus
    || data?.compliance?.msmeStatus
    || data?.msme?.status
    || data?.msmeStatus;
  if (directStatus) return directStatus;

  const rows = normalizeRows(data?.msmeRows || data?.msme || []);
  const statusLabels = ['MSME Status', 'Status', 'Udyam Status', 'Registration Status'];

  for (const row of rows) {
    const entry = Array.isArray(row) ? row[1] : row;
    const status = readField(entry, statusLabels);
    if (status) return status;

    const parsedStatus = parseMsmeStatusValue(entry?.value || entry?.Value || '');
    if (parsedStatus) return parsedStatus;
  }

  return rows.length ? 'Available' : '';
}

function parseMsmeStatusValue(input) {
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

  return match ? match.toUpperCase() : '';
}

function value(input) {
  return input === null || input === undefined || input === '' || input === 'N/A' ? '-' : input;
}

function canShowSalesUpload(piboCategory) {
  const normalized = normalizePiboCategory(piboCategory);
  return /\bproducer\b/.test(normalized) || /\bimporter\b/.test(normalized);
}

function canShowGstUpload(piboCategory) {
  return /\bimporter\b/.test(normalizePiboCategory(piboCategory));
}

function canShowReusePlanUpload(piboCategory) {
  const normalized = normalizePiboCategory(piboCategory);
  return /\bbrand\s+owner\b/.test(normalized) || /\bbrandowner\b/.test(normalized);
}

function normalizePiboCategory(piboCategory) {
  return String(piboCategory || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}

function isUrl(input) {
  return /^https?:\/\//i.test(String(input));
}

function isDataUrl(input) {
  return /^data:[^;]+;base64,/i.test(String(input));
}

function isLinkLike(input) {
  return isUrl(input) || isDataUrl(input);
}

function extractUrls(input) {
  const text = String(input || '');
  if (isDataUrl(text.trim())) return [text.trim()];
  const matches = text.match(/https?:\/\/.*?(?=https?:\/\/|[\s,]|$)/gi) || [];
  return [...new Set(matches.map((match) => match.trim()).filter(Boolean))];
}

function normalizeUrl(input) {
  if (!input) return '#';
  if (isDataUrl(input)) return input;
  return isUrl(input) ? input : `https://${input}`;
}

function getDocumentLabel(input, index = 0) {
  if (isDataUrl(input)) return `Document ${index + 1}`;
  try {
    const normalized = normalizeUrl(input);
    const url = new URL(normalized);
    const fileName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '');
    return fileName || `Document ${index + 1}`;
  } catch {
    return `Document ${index + 1}`;
  }
}

function isDateLike(input) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(input))) return false;
  return !Number.isNaN(new Date(input).getTime());
}

function formatDate(input) {
  if (!input) return '-';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatLabel(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default ClientDetails;
