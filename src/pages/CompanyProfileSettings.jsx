import { useEffect, useState } from 'react';
import api, { resolveServerUrl } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ImageUploadPreview from '@/components/ImageUploadPreview';
import { Save, Upload } from 'lucide-react';

export default function CompanyProfileSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [error, setError] = useState('');

    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyContactNumber, setCompanyContactNumber] = useState('');
    const [companyWhatsAppNumber, setCompanyWhatsAppNumber] = useState('');
    const [companyLogo, setCompanyLogo] = useState(null); // resolved preview src (absolute URL when possible)
    const [companyLogoStore, setCompanyLogoStore] = useState(null); // raw value to save to settings
    const [companyLogoFile, setCompanyLogoFile] = useState(null); // newly selected File
    const [logoObjectUrl, setLogoObjectUrl] = useState(null); // temp preview URL (revoked on change/remove)

    useEffect(() => {
        return () => {
            if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
        };
    }, [logoObjectUrl]);

    const resizeToSquarePng = async (file, size = 512) => {
        // Ensures logos always preview well and upload is standardized.
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        // Transparent background (keeps logo edges clean). PDF/HTML will sit on white background.
        ctx.clearRect(0, 0, size, size);

        const scale = Math.min(size / bitmap.width, size / bitmap.height);
        const w = bitmap.width * scale;
        const h = bitmap.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(bitmap, x, y, w, h);

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (!b) return reject(new Error('Failed to create PNG preview'));
                resolve(b);
            }, 'image/png');
        });
        return blob;
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                setError('');
                const [nameRes, addressRes, logoRes, contactRes, whatsappRes] = await Promise.all([
                    api.get('/settings/company_name'),
                    api.get('/settings/company_address'),
                    api.get('/settings/company_logo'),
                    api.get('/settings/company_contact_number'),
                    api.get('/settings/company_whatsapp_number')
                ]);

                setCompanyName(nameRes.data.value !== 'false' ? (nameRes.data.value || '') : '');
                setCompanyAddress(addressRes.data.value !== 'false' ? (addressRes.data.value || '') : '');
                const rawLogo = logoRes.data.value !== 'false' ? (logoRes.data.value || null) : null;
                setCompanyLogoStore(rawLogo);
                setCompanyLogo(rawLogo ? resolveServerUrl(rawLogo) : null);
                setCompanyContactNumber(contactRes.data.value !== 'false' ? (contactRes.data.value || '') : '');
                setCompanyWhatsAppNumber(whatsappRes.data.value !== 'false' ? (whatsappRes.data.value || '') : '');
            } catch (e) {
                console.error('Failed to fetch company profile settings:', e);
                setError(e.response?.data?.message || 'Failed to load company settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const normalizeOrFalse = (value) => {
        const v = String(value ?? '').trim();
        return v ? v : 'false';
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const logoUrlStore = companyLogoStore;

            // Note: we upload immediately on selection for reliable preview.
            // So handleSave only stores the already-uploaded URL (or false).

            await Promise.all([
                api.put('/settings/company_name', { value: normalizeOrFalse(companyName) }),
                api.put('/settings/company_address', { value: normalizeOrFalse(companyAddress) }),
                api.put('/settings/company_contact_number', { value: normalizeOrFalse(companyContactNumber) }),
                api.put('/settings/company_whatsapp_number', { value: normalizeOrFalse(companyWhatsAppNumber) }),
                api.put('/settings/company_logo', { value: logoUrlStore ? logoUrlStore : 'false' }),
            ]);

            // After saving, switch back to URL mode for the preview.
            setCompanyLogoFile(null);
        } catch (e) {
            console.error('Failed to save company profile settings:', e);
            setError(e.response?.data?.message || 'Failed to save company settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-muted-foreground">
                Loading company profile...
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            <Card className="bg-card/50 backdrop-blur-md border-border rounded-[2.5rem] shadow-sm overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-2xl font-black tracking-tighter uppercase tracking-widest">
                        Company Profile Setup
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium mt-1">
                        Configure company name, address, contact numbers and logo. These details will be shown in invoices and downloadable PDF reports.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {error ? (
                        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                            {error}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-2">
                            <Label htmlFor="company_name" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                Company Name
                            </Label>
                            <Input
                                id="company_name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="h-14 bg-background/50 border-border rounded-2xl text-base focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                                placeholder="e.g. Rentix Premium Rentals (PVT) LTD"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company_address" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                Company Address
                            </Label>
                            <Textarea
                                id="company_address"
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                className="min-h-28 bg-background/50 border-border rounded-2xl text-base focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                                placeholder="Enter full address used in invoices"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company_contact_number" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                Contact Number
                            </Label>
                            <Input
                                id="company_contact_number"
                                value={companyContactNumber}
                                onChange={(e) => setCompanyContactNumber(e.target.value)}
                                className="h-14 bg-background/50 border-border rounded-2xl text-base focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                                placeholder="e.g. +94 7X XXX XXXX"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company_whatsapp_number" className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                WhatsApp Number
                            </Label>
                            <Input
                                id="company_whatsapp_number"
                                value={companyWhatsAppNumber}
                                onChange={(e) => setCompanyWhatsAppNumber(e.target.value)}
                                className="h-14 bg-background/50 border-border rounded-2xl text-base focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all font-medium"
                                placeholder="e.g. +94 7X XXX XXXX"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-1">
                                    Company Logo
                                </Label>
                                <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                                    <Upload className="w-4 h-4" />
                                    PNG/JPG preferred
                                </div>
                            </div>

                            <ImageUploadPreview
                                id="company_logo"
                                label="Company Logo"
                                required={false}
                                file={companyLogo}
                                squarePreview={true}
                                imageObjectFit="contain"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0] || null;
                                    if (!f) return;
                                    setError('');
                                    setLogoUploading(true);
                                    try {
                                        if (!String(f.type || '').startsWith('image/')) {
                                            throw new Error('Please upload a PNG/JPG image file.');
                                        }

                                        // Resize locally for guaranteed preview quality.
                                        const resizedBlob = await resizeToSquarePng(f, 512);
                                        if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
                                        const previewUrl = URL.createObjectURL(resizedBlob);
                                        setLogoObjectUrl(previewUrl);
                                        setCompanyLogo(previewUrl);

                                        const formData = new FormData();
                                        formData.append('file', resizedBlob, 'company_logo.png');
                                        const uploadRes = await api.post('/upload', formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' },
                                        });
                                        const rawUrl = uploadRes.data?.url || null;
                                        setCompanyLogoStore(rawUrl);
                                        if (rawUrl) {
                                            const resolved = resolveServerUrl(rawUrl);
                                            setCompanyLogo(resolved);
                                            URL.revokeObjectURL(previewUrl);
                                            setLogoObjectUrl(null);
                                        } else {
                                            setCompanyLogo(previewUrl);
                                        }
                                        setCompanyLogoFile(null);
                                    } catch (e2) {
                                        console.error('Failed to upload company logo for preview:', e2);
                                        setError(e2.response?.data?.message || 'Failed to upload logo for preview');
                                    } finally {
                                        setLogoUploading(false);
                                    }
                                }}
                                onView={(preview) => {
                                    // Preview handled by ImageUploadPreview (object URL or existing URL).
                                    if (preview && typeof preview === 'string') {
                                        window.open(preview, '_blank', 'noopener,noreferrer');
                                    }
                                }}
                                onRemove={() => {
                                    setCompanyLogoFile(null);
                                    setCompanyLogoStore(null);
                                    setCompanyLogo(null);
                                }}
                            />

                            {logoUploading ? (
                                <div className="text-xs text-muted-foreground font-medium mt-2">
                                    Uploading logo for preview...
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={saving || logoUploading}
                            className="px-8 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all gap-3"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : logoUploading ? 'Uploading...' : 'Save Company Profile'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

