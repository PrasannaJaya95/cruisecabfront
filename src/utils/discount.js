/**
 * Restore discount UI state from persisted fields, or infer percentage from rates (legacy records).
 */
export function resolveDiscountState({ baseDailyRate, appliedDailyRate, discountType, discountValue }) {
    const storedType = String(discountType || '').toUpperCase();
    const storedVal = Number(discountValue);
    const hasStored =
        (storedType === 'PERCENT' || storedType === 'AMOUNT') && Number.isFinite(storedVal);

    if (hasStored) {
        return {
            discountType: storedType,
            discountValue: String(storedVal),
            baseDailyRate: Number(baseDailyRate) || 0,
        };
    }

    const base = Number(baseDailyRate) || 0;
    const applied = Number(appliedDailyRate) || 0;
    if (base > 0 && applied <= base) {
        const pct = ((base - applied) / base) * 100;
        return {
            discountType: 'PERCENT',
            discountValue: String(Number.isFinite(pct) ? Number(pct.toFixed(2)) : 0),
            baseDailyRate: base,
        };
    }

    return {
        discountType: 'PERCENT',
        discountValue: '0',
        baseDailyRate: base > 0 ? base : applied,
    };
}
