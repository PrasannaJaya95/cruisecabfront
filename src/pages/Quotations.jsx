import { useEffect, useMemo, useRef, useState } from 'react';
import { format, addDays } from 'date-fns';
import api, { resolveServerUrl } from '../lib/api';
import { formatDateTime } from '../lib/dates';
import useDebounce from '@/hooks/useDebounce';
import { DOCUMENT_PRINT_STYLES, hasPrintBrandContent } from '../lib/printDocumentTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TimeInput24 } from '@/components/ui/time-input-24';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, FileText, MessageCircle, ChevronLeft, ChevronRight, Eye, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import Pagination from '../components/Pagination';
import {
    normalizePhoneForWhatsApp,
    pickCustomerWhatsAppPhone,
    openWhatsAppWeb,
} from '../lib/whatsappWeb';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useBrand } from '../context/BrandContext';

function qEscape(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Local calendar date + time (HH:mm) → ISO string for API / storage */
function combineLocalDateTimeToIso(dateYmd, timeHm) {
    const [y, mo, d] = String(dateYmd || '').split('-').map(Number);
    if (!y || !mo || !d) return new Date().toISOString();
    const tp = String(timeHm || '00:00').split(':');
    const h = Number(tp[0]) || 0;
    const mi = Number(tp[1]) || 0;
    const local = new Date(y, mo - 1, d, h, mi, 0, 0);
    return local.toISOString();
}

/** Day-first date + 24h time, identical to backend's quotation share page. */
const formatQuotationDateTime = formatDateTime;

const MS_PER_RENTAL_DAY = 24 * 60 * 60 * 1000;

/** Exact rental length in 24h day-units (pick-up 08:00 → next day 08:00 = 1). */
function computeRentalDayUnits(pickupIso, dropoffIso) {
    const start = new Date(pickupIso);
    const end = new Date(dropoffIso);
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return 0;
    return ms / MS_PER_RENTAL_DAY;
}

function formatRentalPeriod(pickupIso, dropoffIso) {
    const start = new Date(pickupIso);
    const end = new Date(dropoffIso);
    const ms = end.getTime() - start.getTime();
    if (!Number.isFinite(ms) || ms <= 0) return '—';
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    return parts.length ? parts.join(', ') : 'Less than 1 minute';
}

/** Same calendar instant within 2s — avoids ref/live ISO mismatch after save or timezone quirks */
function samePickupDropoffInstant(a, b) {
    const ta = new Date(a).getTime();
    const tb = new Date(b).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
    return Math.abs(ta - tb) < 2000;
}

/** When the form matches a row already in the DB (e.g. after refresh), recover id for share links */
function findHistoryRowMatchingForm(live, history) {
    if (!Array.isArray(history) || !live?.vehicleId) return null;
    const name = String(live.customerName || '').trim().toLowerCase();
    const rows = history.filter((h) => {
        if (h.vehicleId !== live.vehicleId) return false;
        if (!samePickupDropoffInstant(h.pickupDate, live.pickupDate)) return false;
        if (!samePickupDropoffInstant(h.dropoffDate, live.dropoffDate)) return false;
        if (name) {
            const hn = String(h.customerName || '').trim().toLowerCase();
            if (hn && hn !== name) return false;
        }
        return true;
    });
    return rows[0] || null;
}

export default function Quotations() {
    const { name: companyName, address: companyAddress, logo: companyLogo, contact: companyContact, whatsapp: companyWhatsApp } = useBrand();
    const [vehicles, setVehicles] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [bookings, setBookings] = useState([]);
    /// Posted (non-reversed) advance receipts. Used to decide whether an overlapping
    /// contract should hide the vehicle (advance paid → real reservation) or just
    /// show it as a tentative/at-risk option (no advance paid yet → could fall through).
    const [advanceReceipts, setAdvanceReceipts] = useState([]);
    const [quotationHistory, setQuotationHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const debouncedSearch = useDebounce(historySearch, 500);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 20 });

    const [customerMode, setCustomerMode] = useState('EXISTING'); // EXISTING | NEW
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [quotationWhatsAppPhone, setQuotationWhatsAppPhone] = useState('');
    const [customerType, setCustomerType] = useState('LOCAL'); // LOCAL | FOREIGN | CORPORATE

    const [vehicleId, setVehicleId] = useState('');
    const [fleetCategories, setFleetCategories] = useState([]);
    const [quotationVehicleCategoryFilter, setQuotationVehicleCategoryFilter] = useState('all');
    const [quotationVehicleSearch, setQuotationVehicleSearch] = useState('');
    const [pickupDate, setPickupDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dropoffDate, setDropoffDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    /// Default pick-up/drop-off times to "now" (HH:mm) when the form first mounts,
    /// so a brand-new quotation starts at the current time. The drop-off time stays
    /// in lock-step with the pick-up time (see the pick-up onChange handler below).
    const [pickupTime, setPickupTime] = useState(() => format(new Date(), 'HH:mm'));
    const [dropoffTime, setDropoffTime] = useState(() => format(new Date(), 'HH:mm'));
    const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT | AMOUNT
    const [discountValue, setDiscountValue] = useState('0');

    /** After save: merge id into WhatsApp until pickup/dropoff/vehicle change */
    const postSaveMergeRef = useRef(null);

    // Success Wizard State
    const [successWizardOpen, setSuccessWizardOpen] = useState(false);
    const [currentSavedQuotation, setCurrentSavedQuotation] = useState(null);
    const [copied, setCopied] = useState(false);

    /// Empty `amount` means "0" but renders as an empty input (so users can type freely without deleting a default "0" first).
    const [extraCharges, setExtraCharges] = useState([{ description: '', amount: '' }]);

    /** Refundable security deposit. Empty string = 0 but renders as an empty input. */
    const [securityDeposit, setSecurityDeposit] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                api.get('/vehicles?limit=1000'),
                api.get('/fleet/categories?limit=1000'),
                api.get('/clients?limit=1000'),
                api.get('/contracts?limit=1000'),
                api.get('/bookings?limit=1000'),
                api.get(`/quotations?page=${page}&limit=20&search=${debouncedSearch}`),
                api.get('/advance-receipts?limit=1000'),
            ]);

            const getData = (idx, fallback) => {
                const r = results[idx];
                if (r.status === 'fulfilled') {
                    const data = r.value?.data;
                    return (data && typeof data === 'object' && 'data' in data) ? data.data : (data ?? fallback);
                }
                return fallback;
            };

            setVehicles(getData(0, []));
            const cats = getData(1, []);
            setFleetCategories(Array.isArray(cats) ? cats : []);
            const rawClients = getData(2, []);
            const clientList = Array.isArray(rawClients) ? rawClients : [];
            setCustomers(clientList.filter((c) => c.status !== 'ARCHIVED'));
            setContracts(getData(3, []));
            setBookings(getData(4, []));
            setQuotationHistory(getData(5, []));
            const ar = getData(6, []);
            setAdvanceReceipts(Array.isArray(ar) ? ar : []);

            const quotResult = results[5];
            if (quotResult.status === 'fulfilled' && quotResult.value?.data?.pagination) {
                setPagination(quotResult.value.data.pagination);
            }
        } catch (e) {
            console.error('Failed to load quotation data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearch]);

    useEffect(() => {
        const r = postSaveMergeRef.current;
        if (!r) return;
        const pu = combineLocalDateTimeToIso(pickupDate, pickupTime);
        const dr = combineLocalDateTimeToIso(dropoffDate, dropoffTime);
        if (
            r.vehicleId !== vehicleId ||
            !samePickupDropoffInstant(r.pickupIso, pu) ||
            !samePickupDropoffInstant(r.dropoffIso, dr)
        ) {
            postSaveMergeRef.current = null;
        }
    }, [vehicleId, pickupDate, dropoffDate, pickupTime, dropoffTime]);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === customerId) || null,
        [customers, customerId]
    );

    const selectedVehicle = useMemo(
        () => vehicles.find((v) => v.id === vehicleId) || null,
        [vehicles, vehicleId]
    );

    /// Set of contract IDs that already have a posted, non-reversed advance receipt.
    /// Such contracts are treated as "real" reservations: their vehicles are HIDDEN
    /// from the quotation picker for any overlapping date range. Contracts without a
    /// posted receipt are shown as "tentative" (badge below) so the salesperson knows
    /// the slot is reserved but not yet committed by cash.
    const advancePaidContractIds = useMemo(() => {
        const set = new Set();
        for (const r of advanceReceipts || []) {
            if (r?.contractId && r?.ledgerPostedAt && !r?.reversedAt) {
                set.add(r.contractId);
            }
        }
        return set;
    }, [advanceReceipts]);

    /// Combine a YYYY-MM-DD date and an HH:mm time into a JS Date. Falls back to
    /// 00:00 / 23:59 for missing time so a partial date still produces a usable
    /// half-open interval. Returns null if the date itself is missing.
    const toLocalDateTime = (dateYmd, timeHm, endOfDay = false) => {
        if (!dateYmd) return null;
        const [y, mo, d] = String(dateYmd).split('-').map(Number);
        if (!y || !mo || !d) return null;
        const tp = String(timeHm || (endOfDay ? '23:59' : '00:00')).split(':');
        const h = Number(tp[0]) || 0;
        const mi = Number(tp[1]) || 0;
        return new Date(y, mo - 1, d, h, mi, 0, 0);
    };

    /// Classify each vehicle for the currently-selected pick-up/drop-off range.
    /// status: 'available' | 'tentative' | 'blocked'
    /// - blocked   → overlapping contract has a posted advance receipt (real booking, do NOT show).
    /// - tentative → overlapping contract exists but advance not yet received (show with note).
    /// - available → no overlapping live contract.
    /// When the date range is incomplete, every match is treated as 'available' so the
    /// dropdown still works for users who haven't chosen dates yet.
    const classifiedVehicles = useMemo(() => {
        const reqStart = toLocalDateTime(pickupDate, pickupTime, false);
        const reqEnd = toLocalDateTime(dropoffDate, dropoffTime, true);
        const hasFullRange = reqStart && reqEnd && reqEnd > reqStart;

        return vehicles
            .filter((v) => {
                const catOk =
                    quotationVehicleCategoryFilter === 'all' || v.fleetCategoryId === quotationVehicleCategoryFilter;
                const q = quotationVehicleSearch.trim().toLowerCase();
                const hay = `${v.licensePlate} ${v.vehicleModel?.brand?.name || ''} ${v.vehicleModel?.name || ''} ${v.fleetCategory?.name || ''}`.toLowerCase();
                const searchOk = !q || hay.includes(q);
                return catOk && searchOk;
            })
            .map((v) => {
                if (!hasFullRange) {
                    return { vehicle: v, status: 'available', conflict: null };
                }
                const overlapping = (contracts || []).find((c) => {
                    if (c.vehicleId !== v.id) return false;
                    const liveStatus = String(c.status || '').toUpperCase();
                    if (!['UPCOMING', 'IN_PROGRESS', 'RETURN'].includes(liveStatus)) return false;
                    const cStart = toLocalDateTime(
                        c.pickupDate ? format(new Date(c.pickupDate), 'yyyy-MM-dd') : null,
                        c.pickupTime,
                        false,
                    );
                    const cEnd = toLocalDateTime(
                        c.dropoffDate ? format(new Date(c.dropoffDate), 'yyyy-MM-dd') : null,
                        c.dropoffTime,
                        true,
                    );
                    if (!cStart || !cEnd) return false;
                    // half-open overlap: (newStart < existingEnd) && (existingStart < newEnd)
                    return reqStart < cEnd && cStart < reqEnd;
                });
                if (!overlapping) {
                    return { vehicle: v, status: 'available', conflict: null };
                }
                const isPaid = advancePaidContractIds.has(overlapping.id);
                return {
                    vehicle: v,
                    status: isPaid ? 'blocked' : 'tentative',
                    conflict: overlapping,
                };
            })
            .filter((entry) => entry.status !== 'blocked');
    }, [
        vehicles,
        contracts,
        advancePaidContractIds,
        quotationVehicleCategoryFilter,
        quotationVehicleSearch,
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
    ]);

    /// If the user changes dates and the previously-selected vehicle becomes
    /// blocked (now overlaps a paid reservation), drop the selection so they
    /// can't accidentally quote an unavailable car.
    useEffect(() => {
        if (!vehicleId) return;
        const stillVisible = classifiedVehicles.some((e) => e.vehicle.id === vehicleId);
        if (!stillVisible) {
            setVehicleId('');
        }
    }, [classifiedVehicles, vehicleId]);

    useEffect(() => {
        if (customerMode === 'EXISTING' && selectedCustomer) {
            const inferredName = selectedCustomer.type === 'CORPORATE'
                ? (selectedCustomer.companyName || '')
                : (selectedCustomer.name || '');
            setCustomerName(inferredName);
            setCustomerEmail(selectedCustomer.email || '');
            setCustomerType((selectedCustomer.type || 'LOCAL').toUpperCase());
            setQuotationWhatsAppPhone(pickCustomerWhatsAppPhone(selectedCustomer) || '');
        }
    }, [customerMode, selectedCustomer]);

    const pickupIso = useMemo(
        () => combineLocalDateTimeToIso(pickupDate, pickupTime),
        [pickupDate, pickupTime]
    );
    const dropoffIso = useMemo(
        () => combineLocalDateTimeToIso(dropoffDate, dropoffTime),
        [dropoffDate, dropoffTime]
    );

    const rentalDayUnits = useMemo(
        () => computeRentalDayUnits(pickupIso, dropoffIso),
        [pickupIso, dropoffIso]
    );

    const rentalPeriodLabel = useMemo(
        () => formatRentalPeriod(pickupIso, dropoffIso),
        [pickupIso, dropoffIso]
    );

    const baseDailyRate = useMemo(() => {
        if (!selectedVehicle) return 0;
        const isForeign = (customerType || '').toUpperCase() === 'FOREIGN';
        if (isForeign) return Number(selectedVehicle.foreignDailyRentalRate || selectedVehicle.dailyRentalRate || 0);
        return Number(selectedVehicle.dailyRentalRate || 0);
    }, [selectedVehicle, customerType]);

    const dailyRate = useMemo(() => {
        const base = Number(baseDailyRate) || 0;
        const dv = Math.max(0, Number(discountValue) || 0);
        let discounted = base;
        if (discountType === 'PERCENT') {
            discounted = base - (base * dv / 100);
        } else {
            discounted = base - dv;
        }
        return Math.max(0, Number(discounted.toFixed(2)));
    }, [baseDailyRate, discountType, discountValue]);

    const baseAmount = useMemo(
        () => Number((dailyRate * rentalDayUnits).toFixed(2)),
        [dailyRate, rentalDayUnits]
    );
    const extraAmount = useMemo(
        () => extraCharges.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
        [extraCharges]
    );
    /// Refundable; included in the grand total so the customer knows the up-front amount,
    /// but tracked separately on the Quotation record so it can be excluded from revenue / P&L.
    const securityDepositAmount = useMemo(
        () => Math.max(0, Number(securityDeposit) || 0),
        [securityDeposit]
    );
    const grandTotal = baseAmount + extraAmount + securityDepositAmount;

    const quotationNo = useMemo(() => {
        const now = new Date();
        const d = format(now, 'yyyyMMdd-HHmmss');
        return `QT-${d}`;
    }, []);

    const addExtraRow = () => {
        setExtraCharges((prev) => [...prev, { description: '', amount: '' }]);
    };

    const removeExtraRow = (idx) => {
        setExtraCharges((prev) => prev.filter((_, i) => i !== idx));
    };

    /// Keep `amount` as the raw input string so the field can be empty (no forced "0" prefix); coerce to Number only at compute/save time.
    const updateExtraRow = (idx, key, value) => {
        setExtraCharges((prev) =>
            prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r))
        );
    };

    const checkVehicleConflicts = (targetVehicleId, targetPickupDate, targetDropoffDate) => {
        const toDateOnly = (d) => {
            const dt = new Date(d);
            return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };
        const reqStart = toDateOnly(targetPickupDate);
        const reqEnd = toDateOnly(targetDropoffDate);
        const isOverlapping = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;

        const contractConflicts = (contracts || [])
            .filter((c) => c.vehicleId === targetVehicleId && ['UPCOMING', 'IN_PROGRESS', 'RETURN'].includes(String(c.status || '').toUpperCase()))
            .filter((c) => isOverlapping(toDateOnly(c.pickupDate), toDateOnly(c.dropoffDate), reqStart, reqEnd))
            .map((c) => ({
                source: 'Contract',
                ref: c.contractNo || c.id,
                start: format(new Date(c.pickupDate), 'yyyy-MM-dd'),
                end: format(new Date(c.dropoffDate), 'yyyy-MM-dd'),
            }));

        const bookingConflicts = (bookings || [])
            .filter((b) => b.vehicleId === targetVehicleId && ['PENDING', 'CONFIRMED'].includes(String(b.status || '').toUpperCase()))
            .filter((b) => isOverlapping(toDateOnly(b.startDate), toDateOnly(b.endDate), reqStart, reqEnd))
            .map((b) => ({
                source: 'Booking',
                ref: b.id,
                start: format(new Date(b.startDate), 'yyyy-MM-dd'),
                end: format(new Date(b.endDate), 'yyyy-MM-dd'),
            }));

        return [...contractConflicts, ...bookingConflicts];
    };

    const buildLiveQuotationData = () => {
        const pickupDateIso = pickupIso;
        const dropoffDateIso = dropoffIso;
        return {
            quotationNo,
            issueDate: new Date().toISOString(),
            validUntil: addDays(new Date(), 7).toISOString(),
            customerMode,
            customerId: customerMode === 'EXISTING' ? customerId : null,
            customerName: customerName.trim(),
            customerEmail: customerEmail || '',
            customerType,
            vehicleId,
            pickupDate: pickupDateIso,
            dropoffDate: dropoffDateIso,
            rentalDays: rentalDayUnits,
            dailyRate: Number(dailyRate || 0),
            baseAmount: Number(baseAmount || 0),
            extraCharges: extraCharges
                .map((r) => ({ description: r.description || '', amount: Number(r.amount) || 0 }))
                .filter((r) => r.description.trim() || r.amount !== 0),
            extraAmount: Number(extraAmount || 0),
            securityDeposit: securityDepositAmount,
            totalAmount: Number(grandTotal || 0),
            vehicle: selectedVehicle || null,
        };
    };

    const buildQuotationWhatsAppText = (q, vehicle, shareUrl = '') => {
        const veh = vehicle || q.vehicle;
        const vehLabel = `${veh?.vehicleModel?.brand?.name || ''} ${veh?.vehicleModel?.name || ''}`.trim();
        const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
        const validUntil = q.validUntil ? new Date(q.validUntil) : addDays(issueDate, 7);
        const rows = Array.isArray(q.extraCharges) ? q.extraCharges : [];
        const extraLines = rows
            .filter((r) => (String(r.description || '').trim() || Number(r.amount || 0) !== 0))
            .map((r) => `• ${String(r.description || 'Extra').trim()}: LKR ${Number(r.amount || 0).toLocaleString()}`)
            .join('\n');

        const parts = [
            `Hello ${q.customerName || 'there'},`,
            '',
            `Quotation *${q.quotationNo || 'Draft'}*`,
            `Vehicle: ${veh?.licensePlate || '-'}${vehLabel ? ` (${vehLabel})` : ''}`,
            `Period: ${formatQuotationDateTime(q.pickupDate)} → ${formatQuotationDateTime(q.dropoffDate)} (${formatRentalPeriod(q.pickupDate, q.dropoffDate)})`,
            `Daily rate: LKR ${Number(q.dailyRate || 0).toLocaleString()}`,
            `Base rental: LKR ${Number(q.baseAmount || 0).toLocaleString()}`,
        ];
        if (extraLines) {
            parts.push('Extras:', extraLines);
        }
        if (Number(q.securityDeposit || 0) > 0) {
            parts.push(`Security deposit (refundable): LKR ${Number(q.securityDeposit).toLocaleString()}`);
        }
        parts.push(
            '',
            `*Grand total: LKR ${Number(q.totalAmount || 0).toLocaleString()}*`,
        );
        if (Number(q.securityDeposit || 0) > 0) {
            parts.push(`(Includes LKR ${Number(q.securityDeposit).toLocaleString()} refundable security deposit)`);
        }
        parts.push(
            '',
            `Valid through ${format(validUntil, 'dd/MM/yyyy')}.`,
        );
        if (shareUrl) {
            parts.push('', `View quotation online: ${shareUrl}`);
        }
        parts.push(
            '',
            'Reply to confirm or if you have questions. We can provide a PDF on request.',
        );
        if (companyName.trim()) {
            parts.push('', `_${companyName.trim()}_`);
        }
        return parts.join('\n');
    };

    const sendQuotationViaWhatsApp = async (savedQuotation = null) => {
        const live = buildLiveQuotationData();
        const ref = postSaveMergeRef.current;
        const keysMatch =
            ref &&
            ref.vehicleId === live.vehicleId &&
            samePickupDropoffInstant(ref.pickupIso, live.pickupDate) &&
            samePickupDropoffInstant(ref.dropoffIso, live.dropoffDate);

        const fromHistory = !savedQuotation ? findHistoryRowMatchingForm(live, quotationHistory) : null;

        let q;
        if (savedQuotation) {
            q = savedQuotation;
        } else if (keysMatch && ref) {
            q = {
                ...live,
                id: ref.id,
                quotationNo: ref.quotationNo,
                issueDate: ref.issueDate,
                validUntil: ref.validUntil,
                vehicle: live.vehicle || ref.vehicle,
            };
        } else if (fromHistory) {
            q = {
                ...live,
                id: fromHistory.id,
                quotationNo: fromHistory.quotationNo,
                issueDate: fromHistory.issueDate,
                validUntil: fromHistory.validUntil,
                pickupDate: fromHistory.pickupDate,
                dropoffDate: fromHistory.dropoffDate,
                rentalDays: fromHistory.rentalDays,
                dailyRate: fromHistory.dailyRate,
                baseAmount: fromHistory.baseAmount,
                extraCharges: fromHistory.extraCharges,
                extraAmount: fromHistory.extraAmount,
                totalAmount: fromHistory.totalAmount,
                vehicle: fromHistory.vehicle || live.vehicle,
                customer: fromHistory.customer,
            };
        } else {
            q = live;
        }

        const vehicle = q.vehicle || vehicles.find((v) => v.id === q.vehicleId) || null;
        if (!vehicle) {
            alert('Please select a vehicle first.');
            return;
        }
        const phoneRaw =
            (savedQuotation && pickCustomerWhatsAppPhone(savedQuotation.customer)) ||
            quotationWhatsAppPhone.trim() ||
            pickCustomerWhatsAppPhone(selectedCustomer);
        const phone = normalizePhoneForWhatsApp(phoneRaw);
        if (!phone) {
            alert(
                'No WhatsApp number found. For new customers, enter mobile/WhatsApp below. For existing customers, ensure phone or mobile is saved on the customer record.'
            );
            return;
        }
        let shareUrl = '';
        let shareLinkError = '';
        if (q.id) {
            try {
                const { data } = await api.get(`/quotations/${q.id}/share-link`);
                shareUrl = data?.shareUrl || '';
            } catch (e) {
                console.error(e);
                shareLinkError =
                    e.response?.data?.message ||
                    (e.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
                    e.message ||
                    '';
            }
        }
        if (!q.id) {
            alert(
                'This quotation is not linked to a saved record, so no customer link can be added. Click “Save Quotation” first, then use WhatsApp again — or use the green WA button on the row in Quotation History.'
            );
        } else if (!shareUrl) {
            alert(
                shareLinkError
                    ? `Could not load the share link:\n\n${shareLinkError}`
                    : 'Could not load the share link (empty response). Check that the API is running.'
            );
        }
        const msg = buildQuotationWhatsAppText(q, vehicle, shareUrl);
        openWhatsAppWeb(phone, msg);
    };

    /**
     * Open the public, customer-facing quotation page — the same URL the
     * customer receives via the WhatsApp share link.
     */
    const previewSharedQuotation = async (q) => {
        if (!q?.id) {
            alert('This quotation has not been saved yet. Click “Save Quotation” first.');
            return;
        }
        try {
            const { data } = await api.get(`/quotations/${q.id}/share-link`);
            const url = data?.shareUrl;
            if (!url) {
                alert('Could not load the preview link (empty response). Check that the API is running.');
                return;
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.error(e);
            const msg =
                e.response?.data?.message ||
                (e.response?.data?.errors && JSON.stringify(e.response.data.errors)) ||
                e.message ||
                'Failed to load preview link';
            alert(`Could not load the preview link:\n\n${msg}`);
        }
    };

    const buildQuotationHtml = (q) => {
        const issueDate = q.issueDate ? new Date(q.issueDate) : new Date();
        const validUntil = q.validUntil ? new Date(q.validUntil) : addDays(issueDate, 7);
        const vehicle = q.vehicle || selectedVehicle || null;
        const rows = Array.isArray(q.extraCharges) ? q.extraCharges : [];

        const showBrand = hasPrintBrandContent({
            logoUrl: companyLogo,
            name: companyName,
            address: companyAddress,
            contact: companyContact,
            whatsapp: companyWhatsApp,
        });
        const logoImg = companyLogo
            ? `<img class="doc-logo" src="${qEscape(companyLogo)}" alt="" />`
            : '';
        const nameBlock = companyName.trim()
            ? `<div class="doc-company-name">${qEscape(companyName.trim())}</div>`
            : companyLogo
                ? `<div class="doc-company-name" style="font-size:16px;color:var(--muted);">Your rental partner</div>`
                : '';
        const addrBlock = companyAddress.trim()
            ? `<div class="doc-company-muted">${qEscape(companyAddress).replace(/\n/g, '<br/>')}</div>`
            : '';
        const chips = [];
        if (companyContact.trim()) {
            chips.push(`<span class="doc-chip">Contact ${qEscape(companyContact.trim())}</span>`);
        }
        if (companyWhatsApp.trim()) {
            chips.push(`<span class="doc-chip">WhatsApp ${qEscape(companyWhatsApp.trim())}</span>`);
        }
        const chipRow = chips.length ? `<div class="doc-chip-row">${chips.join('')}</div>` : '';
        const brandSection = showBrand
            ? `<div class="doc-brand-row">${logoImg}<div>${nameBlock}${addrBlock}${chipRow}</div></div>`
            : '';

        const vehLabel = `${vehicle?.vehicleModel?.brand?.name || ''} ${vehicle?.vehicleModel?.name || ''}`.trim();
        const rowsHtml = `
      <tr><td>Base rental (${qEscape(formatRentalPeriod(q.pickupDate, q.dropoffDate))} @ ${Number(q.dailyRate || 0).toLocaleString()} LKR/day)</td><td>${Number(q.baseAmount || 0).toLocaleString()}</td></tr>
      ${rows.map((r) => `
      <tr><td>${qEscape(r.description || 'Extra charge')}</td><td>${Number(r.amount || 0).toLocaleString()}</td></tr>`).join('')}`;

        const securityDepositValue = Number(q.securityDeposit || 0);
        const securityRow = securityDepositValue > 0
            ? `<tr><td>Security deposit <span style="font-style:italic;color:var(--muted);">(refundable)</span></td><td>${securityDepositValue.toLocaleString()}</td></tr>`
            : '';

        return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${qEscape(q.quotationNo || 'Quotation')}</title>
  <style>${DOCUMENT_PRINT_STYLES}</style>
</head>
<body>
  <div class="doc">
    <div class="doc-topbar"></div>
    <div class="doc-inner">
      ${brandSection}
      <div class="doc-headline">
        <div>
          <div class="doc-kind">Quotation</div>
          <div class="doc-main-id">${qEscape(q.quotationNo || 'Draft')}</div>
          <div class="doc-meta">Issued <b>${qEscape(formatQuotationDateTime(issueDate))}</b> · Valid through <b>${qEscape(formatQuotationDateTime(validUntil))}</b></div>
        </div>
        <div class="doc-pill doc-pill-em">${qEscape(formatRentalPeriod(q.pickupDate, q.dropoffDate))}</div>
      </div>

      <div class="doc-cards">
        <div class="doc-card">
          <div class="doc-card-label">Customer</div>
          <div class="doc-card-value">${qEscape(q.customerName || '')}</div>
          <div class="doc-card-sub">${qEscape(q.customerEmail || '—')}</div>
          <div class="doc-chip-row" style="margin-top:10px;"><span class="doc-chip">${qEscape(q.customerType || '')}</span></div>
        </div>
        <div class="doc-card">
          <div class="doc-card-label">Vehicle</div>
          <div class="doc-card-value">${qEscape(vehicle?.licensePlate || '')}</div>
          <div class="doc-card-sub">${qEscape(vehLabel)}</div>
        </div>
      </div>

        <div class="doc-card" style="margin-bottom:16px;background:#fff;border-style:dashed;">
        <div class="doc-card-label">Rental period</div>
        <div class="doc-card-value" style="font-size:15px;">
          <div><b>Pick-up:</b> ${qEscape(formatQuotationDateTime(q.pickupDate))}</div>
          <div><b>Drop-off:</b> ${qEscape(formatQuotationDateTime(q.dropoffDate))}</div>
        </div>
      </div>

      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr><th>Description</th><th>Amount (LKR)</th></tr>
          </thead>
          <tbody>${rowsHtml}${securityRow}</tbody>
          <tfoot>
            <tr><td>Grand total</td><td>${Number(q.totalAmount || 0).toLocaleString()}</td></tr>
          </tfoot>
        </table>
      </div>

      <div class="doc-foot">
        System-generated quotation — no signature required. Valid for 7 days from the issue date.
        Use your browser print dialog and choose &quot;Save as PDF&quot; to download.
      </div>
      <div class="doc-brand-footer">
        Powered by <b>Rentix</b><br/>
        All rights reserved. Codebraze PVT LTD<br/>
        070 2 78 78 73 | www.codebraze.lk
      </div>
    </div>
  </div>
</body>
</html>`;
    };

    const openPrintHtml = (html) => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
    };

    const downloadQuotationPdf = (quotationRow = null) => {
        const q = quotationRow || buildLiveQuotationData();
        if (!q.vehicleId) {
            alert('Please select a vehicle first.');
            return;
        }
        if (!String(q.customerName || '').trim()) {
            alert('Please provide customer name.');
            return;
        }

        const conflicts = checkVehicleConflicts(q.vehicleId, q.pickupDate, q.dropoffDate);
        if (!quotationRow && conflicts.length > 0) {
            const details = conflicts
                .map((c, i) => `${i + 1}. ${c.source} ${c.ref} -> ${c.start} to ${c.end}`)
                .join('\n');
            alert(`This vehicle already has an existing booking/contract in the selected date range.\n\nSelected: ${formatQuotationDateTime(q.pickupDate)} → ${formatQuotationDateTime(q.dropoffDate)}\n\nConflicts:\n${details}`);
            return;
        }
        openPrintHtml(buildQuotationHtml(q));
    };

    const saveQuotation = async () => {
        const q = buildLiveQuotationData();
        if (!q.vehicleId) return alert('Please select a vehicle first.');
        if (!String(q.customerName || '').trim()) return alert('Please provide customer name.');
        if (!q.rentalDays || q.rentalDays <= 0) {
            return alert('Drop-off must be after pick-up (each rental day is 24 hours from pick-up time).');
        }

        const conflicts = checkVehicleConflicts(q.vehicleId, q.pickupDate, q.dropoffDate);
        if (conflicts.length > 0) {
            const details = conflicts
                .map((c, i) => `${i + 1}. ${c.source} ${c.ref} -> ${c.start} to ${c.end}`)
                .join('\n');
            alert(`This vehicle already has an existing booking/contract in the selected date range.\n\nSelected: ${formatQuotationDateTime(q.pickupDate)} → ${formatQuotationDateTime(q.dropoffDate)}\n\nConflicts:\n${details}`);
            return;
        }

        try {
            setSaving(true);
            const payload = {
                customerMode: q.customerMode,
                customerId: q.customerMode === 'EXISTING' ? q.customerId : null,
                customerName: q.customerName,
                customerEmail: q.customerEmail || null,
                customerType: q.customerType,
                vehicleId: q.vehicleId,
                pickupDate: q.pickupDate,
                dropoffDate: q.dropoffDate,
                rentalDays: q.rentalDays,
                dailyRate: q.dailyRate,
                baseDailyRate: Number(baseDailyRate || 0),
                discountType,
                discountValue: Number(discountValue) || 0,
                baseAmount: q.baseAmount,
                extraCharges: q.extraCharges,
                extraAmount: q.extraAmount,
                totalAmount: q.totalAmount,
                securityDeposit: q.securityDeposit,
            };
            const { data: created } = await api.post('/quotations', payload);
            const pickupIso = new Date(created.pickupDate).toISOString();
            const dropoffIso = new Date(created.dropoffDate).toISOString();
            postSaveMergeRef.current = {
                id: created.id,
                quotationNo: created.quotationNo,
                issueDate: created.issueDate,
                validUntil: created.validUntil,
                vehicleId: created.vehicleId,
                pickupIso,
                dropoffIso,
                vehicle: created.vehicle,
            };
            const { data: qData } = await api.get('/quotations?limit=1000');
            const qList = Array.isArray(qData.data) ? qData.data : (Array.isArray(qData) ? qData : []);
            setQuotationHistory(qList);
            setCurrentSavedQuotation(created);
            setSuccessWizardOpen(true);

            // Reset form fields
            setCustomerMode('EXISTING');
            setCustomerId('');
            setCustomerName('');
            setCustomerEmail('');
            setQuotationWhatsAppPhone('');
            setCustomerType('LOCAL');
            setVehicleId('');
            setPickupDate(format(new Date(), 'yyyy-MM-dd'));
            const nowTime = format(new Date(), 'HH:mm');
            setPickupTime(nowTime);
            setDropoffDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
            setDropoffTime(nowTime);
            setDiscountType('PERCENT');
            setDiscountValue('0');
            setExtraCharges([{ description: '', amount: '' }]);
            setSecurityDeposit('');
            setQuotationVehicleSearch('');
            setQuotationVehicleCategoryFilter('all');
            
            // Note: postSaveMergeRef is intentionally left as is if needed for immediate WA sharing, 
            // but since we passed 'created' to the wizard, it uses that instead.
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || 'Failed to save quotation');
        } finally {
            setSaving(false);
        }
    };

    const showScreenBrand = hasPrintBrandContent({
        logoUrl: companyLogo,
        name: companyName,
        address: companyAddress,
        contact: companyContact,
        whatsapp: companyWhatsApp,
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Quotations</h1>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => downloadQuotationPdf()} disabled={loading || saving} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                        <FileText className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => sendQuotationViaWhatsApp(null)}
                        disabled={loading || saving}
                        className="rounded-xl font-black text-[10px] uppercase tracking-widest border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Web
                    </Button>
                    <Button onClick={saveQuotation} disabled={loading || saving} className="rounded-xl font-black text-[10px] uppercase tracking-widest">
                        {saving ? 'Saving...' : 'Save Quotation'}
                    </Button>
                </div>
            </div>

            {showScreenBrand ? (
                <div className="rounded-[1.75rem] border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card p-6 flex flex-col sm:flex-row gap-5 items-start shadow-sm">
                    {companyLogo ? (
                        <img
                            src={companyLogo}
                            alt=""
                            className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl object-contain bg-white/90 border border-border"
                        />
                    ) : null}
                    <div className="min-w-0 space-y-2 flex-1">
                        {companyName.trim() ? (
                            <div className="text-2xl font-black tracking-tight text-foreground">{companyName.trim()}</div>
                        ) : (
                            <div className="text-lg font-bold text-muted-foreground">Company profile</div>
                        )}
                        {companyAddress.trim() ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed max-w-xl">{companyAddress.trim()}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                            {companyContact.trim() ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {companyContact.trim()}
                                </span>
                            ) : null}
                            {companyWhatsApp.trim() ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    WhatsApp {companyWhatsApp.trim()}
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-1">Shown on every quotation PDF</p>
                    </div>
                </div>
            ) : null}

            <Card className="rounded-[1.75rem] border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-lg font-black tracking-tight">Quotation generation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer Source</Label>
                            <Select value={customerMode} onValueChange={setCustomerMode}>
                                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXISTING">Existing Customer</SelectItem>
                                    <SelectItem value="NEW">New Customer (No record creation)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {customerMode === 'EXISTING' ? (
                            <div className="space-y-2">
                                <Label>Customer</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {(c.type === 'CORPORATE' ? c.companyName : c.name) || c.email} ({c.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Customer Type</Label>
                                <Select value={customerType} onValueChange={setCustomerType}>
                                    <SelectTrigger><SelectValue placeholder="Select customer type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOCAL">Local</SelectItem>
                                        <SelectItem value="FOREIGN">Foreign</SelectItem>
                                        <SelectItem value="CORPORATE">Corporate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Customer Name</Label>
                            <Input
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                disabled={customerMode === 'EXISTING'}
                                placeholder="Enter customer name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Customer Email (Optional)</Label>
                            <Input
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                disabled={customerMode === 'EXISTING'}
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>WhatsApp / mobile (for Send via WhatsApp)</Label>
                            <Input
                                value={quotationWhatsAppPhone}
                                onChange={(e) => setQuotationWhatsAppPhone(e.target.value)}
                                placeholder="e.g. 0771234567 or 94771234567 — prefilled from customer when possible"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Opens WhatsApp Web with a pre-filled quotation summary. Edit this if the customer uses a different WhatsApp number.
                            </p>
                        </div>
                    </div>

                    {customerMode === 'EXISTING' ? (
                        <div className="text-sm text-muted-foreground">
                            Customer Type: <b>{customerType || '-'}</b>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Pick-up Date</Label>
                            <Input
                                type="date"
                                value={pickupDate}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setPickupDate(v);
                                    if (v) {
                                        const [y, mo, d] = v.split('-').map(Number);
                                        setDropoffDate(format(addDays(new Date(y, mo - 1, d), 1), 'yyyy-MM-dd'));
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Pick-up Time</Label>
                            <TimeInput24
                                value={pickupTime}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setPickupTime(v);
                                    setDropoffTime(v);
                                }}
                            />
                            <p className="text-[11px] text-muted-foreground">Default: same time next calendar day = 1 rental day (24h). Amount uses exact duration.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Drop-off Date</Label>
                            <Input type="date" value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Drop-off Time</Label>
                            <TimeInput24 value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Filter by category</Label>
                            <Select value={quotationVehicleCategoryFilter} onValueChange={setQuotationVehicleCategoryFilter}>
                                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {fleetCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Search vehicles</Label>
                            <Input
                                placeholder="Plate, brand, model, category…"
                                value={quotationVehicleSearch}
                                onChange={(e) => setQuotationVehicleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-4">
                            <Label>Vehicle</Label>
                            <Select value={vehicleId} onValueChange={setVehicleId}>
                                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                                <SelectContent>
                                    {classifiedVehicles.length === 0 ? (
                                        <div className="px-2 py-3 text-sm text-muted-foreground">
                                            No vehicles match your filters / date range.
                                        </div>
                                    ) : (
                                        classifiedVehicles.map(({ vehicle: v, status, conflict }) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                <span className="flex items-center gap-2">
                                                    <span>
                                                        {v.licensePlate} - {v.vehicleModel?.brand?.name} {v.vehicleModel?.name}
                                                        {v.fleetCategory?.name ? ` · ${v.fleetCategory.name}` : ''}
                                                    </span>
                                                    {status === 'tentative' && (
                                                        <span
                                                            className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                                            title={
                                                                conflict?.contractNo
                                                                    ? `Tentatively reserved by ${conflict.contractNo} (advance not paid)`
                                                                    : 'Tentatively reserved (advance not paid)'
                                                            }
                                                        >
                                                            Booking · advance not paid
                                                        </span>
                                                    )}
                                                </span>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                Vehicles with paid advance for this date range are hidden. 
                                <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ml-1">advance not paid</span> tags indicate pending bookings.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Base Daily Rate (LKR)</Label>
                            <Input type="number" value={baseDailyRate} disabled />
                            <p className="text-[11px] text-muted-foreground">
                                {(customerType || '').toUpperCase() === 'FOREIGN' ? 'Foreign base rate' : 'Local/Corporate base rate'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Discount Type</Label>
                            <Select value={discountType} onValueChange={setDiscountType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PERCENT">Percent (%)</SelectItem>
                                    <SelectItem value="AMOUNT">Amount (LKR)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Discount Value</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                placeholder={discountType === 'PERCENT' ? '0 - 100' : '0.00'}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Applied daily rate after discount: <b>{Number(dailyRate || 0).toLocaleString()}</b> LKR
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Security Deposit (LKR)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={securityDeposit}
                                onChange={(e) => setSecurityDeposit(e.target.value)}
                                placeholder="0.00"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Refundable. <b>Included</b> in the grand total so the customer sees the up-front amount, but does <b>not</b> affect P&amp;L.
                            </p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Extra Charges</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {extraCharges.map((row, idx) => (
                                <div key={`row-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <Input
                                        className="md:col-span-8"
                                        placeholder="Description"
                                        value={row.description}
                                        onChange={(e) => updateExtraRow(idx, 'description', e.target.value)}
                                    />
                                    <Input
                                        className="md:col-span-3"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Amount"
                                        value={row.amount}
                                        onChange={(e) => updateExtraRow(idx, 'amount', e.target.value)}
                                    />
                                    <Button
                                        variant="destructive"
                                        className="md:col-span-1"
                                        onClick={() => removeExtraRow(idx)}
                                        disabled={extraCharges.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addExtraRow}>
                                <Plus className="w-4 h-4 mr-2" /> Add Charge Row
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-primary/15 bg-gradient-to-b from-card to-muted/10 overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-black tracking-tight flex items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                    <FileText className="h-4 w-4" />
                                </span>
                                Live preview summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-0">
                                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount (LKR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">
                                                Base rental ({rentalPeriodLabel} × {Number(dailyRate).toLocaleString()}/day)
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{Number(baseAmount).toLocaleString()}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Extra charges</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{Number(extraAmount).toLocaleString()}</TableCell>
                                        </TableRow>
                                        {securityDepositAmount > 0 ? (
                                            <TableRow>
                                                <TableCell className="font-medium">
                                                    Security deposit <span className="italic text-muted-foreground text-xs">(refundable)</span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-semibold">{securityDepositAmount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ) : null}
                                        <TableRow className="bg-primary/5 border-t-2 border-primary/30">
                                            <TableCell className="font-black">Grand total</TableCell>
                                            <TableCell className="text-right font-black font-mono text-base text-primary">{Number(grandTotal).toLocaleString()}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
                                Quotation validity: 7 days. Quotations do not create contracts and do not affect P&amp;L.
                                {securityDepositAmount > 0 ? ' The security deposit included in the grand total is refundable.' : ''}
                            </div>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Quotation History</CardTitle>
                    <div className="w-80">
                        <Input 
                            placeholder="Search Quotation #, Customer..."
                            value={historySearch}
                            onChange={(e) => {
                                setHistorySearch(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 text-xs font-bold"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Quotation No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Total (LKR)</TableHead>
                                <TableHead className="text-right">Sec. Deposit (LKR)</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotationHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        No quotations saved yet.
                                    </TableCell>
                                </TableRow>
                            ) : quotationHistory.map((q) => (
                                <TableRow
                                    key={q.id}
                                    onClick={() => previewSharedQuotation(q)}
                                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                                    title="Click row to preview the customer-facing quotation page (same as the WhatsApp share link)"
                                >
                                    <TableCell className="font-medium">{q.quotationNo}</TableCell>
                                    <TableCell>{q.customerName}</TableCell>
                                    <TableCell>
                                        {q.vehicle?.licensePlate} - {q.vehicle?.vehicleModel?.brand?.name} {q.vehicle?.vehicleModel?.name}
                                    </TableCell>
                                    <TableCell>
                                        {formatQuotationDateTime(q.pickupDate)} → {formatQuotationDateTime(q.dropoffDate)}
                                    </TableCell>
                                    <TableCell className="text-right">{Number(q.totalAmount || 0).toLocaleString()}</TableCell>
                                    <TableCell className="text-right text-muted-foreground italic">
                                        {Number(q.securityDeposit || 0) > 0 ? Number(q.securityDeposit).toLocaleString() : '—'}
                                    </TableCell>
                                    <TableCell>{formatQuotationDateTime(q.createdAt)}</TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => previewSharedQuotation(q)}
                                                title="Preview the customer-facing page (same as WhatsApp share link)"
                                            >
                                                <Eye className="w-4 h-4 mr-2" /> Preview
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => downloadQuotationPdf(q)}>
                                                <FileText className="w-4 h-4 mr-2" /> PDF
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                                                onClick={() => sendQuotationViaWhatsApp(q)}
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" /> WA
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <Pagination
                        pagination={pagination}
                        onPageChange={(p) => setPage(p)}
                    />
                </CardContent>
            </Card>

            {/* Success Wizard */}
            <Dialog open={successWizardOpen} onOpenChange={setSuccessWizardOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl font-calibri">
                    <div className="bg-emerald-500 h-1.5 w-full" />
                    <div className="p-8 space-y-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/10">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">
                                    Quotation Saved
                                </DialogTitle>
                                <DialogDescription className="text-sm font-bold text-muted-foreground font-calibri">
                                    {currentSavedQuotation?.quotationNo} has been successfully persisted.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <Button 
                                onClick={() => sendQuotationViaWhatsApp(currentSavedQuotation)}
                                className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#25D366]/90 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-lg shadow-[#25D366]/20 font-calibri-bold"
                            >
                                <MessageCircle className="w-5 h-5" /> Send via WhatsApp
                            </Button>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline"
                                    onClick={() => downloadQuotationPdf(currentSavedQuotation)}
                                    className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                >
                                    <FileText className="w-4 h-4 text-rose-500" /> Download PDF
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => previewSharedQuotation(currentSavedQuotation)}
                                    className="h-14 rounded-2xl border-border font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-secondary font-calibri-bold"
                                >
                                    <ExternalLink className="w-4 h-4 text-blue-500" /> View Online
                                </Button>
                            </div>

                            <Button 
                                variant="secondary"
                                onClick={async () => {
                                    try {
                                        const { data } = await api.get(`/quotations/${currentSavedQuotation.id}/share-link`);
                                        if (data?.shareUrl) {
                                            await navigator.clipboard.writeText(data.shareUrl);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                    }
                                }}
                                className="h-14 rounded-2xl bg-secondary/50 hover:bg-secondary text-foreground font-black uppercase tracking-widest text-xs gap-3 font-calibri-bold"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-5 h-5 text-emerald-500" /> Link Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-5 h-5 opacity-50" /> Copy Share Link
                                    </>
                                )}
                            </Button>
                        </div>

                        <Button 
                            variant="ghost" 
                            onClick={() => setSuccessWizardOpen(false)}
                            className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground font-bold uppercase tracking-widest text-[10px] font-calibri"
                        >
                            Close Wizard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

