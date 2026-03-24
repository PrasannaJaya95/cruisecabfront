import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Globe, ShieldAlert, Save, RefreshCw, Radio, CreditCard, Settings2, Wallet, Trash2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ImageUploadPreview from '@/components/ImageUploadPreview';
import { Palette, ImageIcon, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DemoDataWizard from '@/components/DemoDataWizard';
import RemoveDataWizard from '@/components/RemoveDataWizard';
import DeleteAllDataWizard from '@/components/DeleteAllDataWizard';

const GeneralSettings = () => {
  const [websiteEnabled, setWebsiteEnabled] = useState(false);
  const [maintenanceHeading, setMaintenanceHeading] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [allowLogin, setAllowLogin] = useState(false);
  const [websiteLogo, setWebsiteLogo] = useState(null);

  // Loyalty Points State
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState('');
  const [loyaltyRedeemRate, setLoyaltyRedeemRate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRemoveWizardOpen, setIsRemoveWizardOpen] = useState(false);
  const [isDeleteAllWizardOpen, setIsDeleteAllWizardOpen] = useState(false);
  const { user: currentUser } = useAuth();

  // Payment Gateway State
  const [gatewaySettings, setGatewaySettings] = useState({
    payhere: { enabled: false, merchantId: '', secret: '' },
    webexpay: { enabled: false, apiKey: '', merchantId: '' },
    onepay: { enabled: false, appId: '', hashKey: '' },
    directpay: { enabled: false, clientId: '', secret: '' },
    genie: { enabled: false, merchantId: '', secretKey: '' },
    koko: { enabled: false, apiKey: '' },
    mintpay: { enabled: false, apiKey: '' }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [enabledRes, headingRes, messageRes, loginRes, logoRes, loyaltyEnabledRes, loyaltyEarnRes, loyaltyRedeemRes] = await Promise.all([
        api.get('/settings/website_enabled'),
        api.get('/settings/maintenance_heading'),
        api.get('/settings/maintenance_message'),
        api.get('/settings/maintenance_allow_login'),
        api.get('/settings/website_logo'),
        api.get('/settings/loyalty_enabled'),
        api.get('/settings/loyalty_earn_rate_lkr'),
        api.get('/settings/loyalty_redeem_rate_lkr')
      ]);

      setWebsiteEnabled(enabledRes.data.value === 'true');
      setMaintenanceHeading(headingRes.data.value !== 'false' ? headingRes.data.value : '');
      setMaintenanceMessage(messageRes.data.value !== 'false' ? messageRes.data.value : '');
      setAllowLogin(loginRes.data.value === 'true');
      setWebsiteLogo(logoRes.data.value !== 'false' ? logoRes.data.value : null);

      setLoyaltyEnabled(loyaltyEnabledRes.data.value === 'true');
      setLoyaltyEarnRate(loyaltyEarnRes.data.value !== 'false' ? loyaltyEarnRes.data.value : '1');
      setLoyaltyRedeemRate(loyaltyRedeemRes.data.value !== 'false' ? loyaltyRedeemRes.data.value : '1');

      // Fetch payment gateway settings
      const gatewayKeys = Object.keys(gatewaySettings);
      const gatewayPromises = gatewayKeys.map(key => api.get(`/settings/payment_gateway_${key}`));
      const gatewayResponses = await Promise.all(gatewayPromises);

      const newGatewaySettings = { ...gatewaySettings };
      gatewayResponses.forEach((res, index) => {
        const key = gatewayKeys[index];
        if (res.data.value && res.data.value !== 'false') {
          try {
            newGatewaySettings[key] = JSON.parse(res.data.value);
          } catch (e) {
            console.error(`Failed to parse gateway settings for ${key}`, e);
          }
        }
      });
      setGatewaySettings(newGatewaySettings);

    } catch (error) {
      console.error('Failed to fetch settings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked) => {
    try {
      setWebsiteEnabled(checked);
      await api.put('/settings/website_enabled', { value: checked });
    } catch (error) {
      console.error('Failed to update settings', error);
      setWebsiteEnabled(!checked);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await api.put('/settings/website_logo', { value: websiteLogo || 'false' });
    } catch (error) {
      console.error('Failed to save branding settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaintenanceSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/settings/maintenance_heading', { value: maintenanceHeading }),
        api.put('/settings/maintenance_message', { value: maintenanceMessage }),
        api.put('/settings/maintenance_allow_login', { value: allowLogin })
      ]);
    } catch (error) {
      console.error('Failed to save maintenance settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoyaltySettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/settings/loyalty_enabled', { value: loyaltyEnabled }),
        api.put('/settings/loyalty_earn_rate_lkr', { value: loyaltyEarnRate }),
        api.put('/settings/loyalty_redeem_rate_lkr', { value: loyaltyRedeemRate })
      ]);
    } catch (error) {
      console.error('Failed to save loyalty settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setSaving(true);
    try {
      const gatewayKeys = Object.keys(gatewaySettings);
      const savePromises = gatewayKeys.map(key =>
        api.put(`/settings/payment_gateway_${key}`, { value: JSON.stringify(gatewaySettings[key]) })
      );
      await Promise.all(savePromises);
    } catch (error) {
      console.error('Failed to save payment settings', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDemoData = async () => {
    if (!window.confirm('This will populate the database with demo vehicles, customers, and bookings. Are you sure?')) return;

    setLoadingDemo(true);
    try {
      const response = await api.post('/system/load-demo-data');
      alert(response.data.message);
    } catch (error) {
      console.error('Failed to load demo data', error);
      alert(error.response?.data?.message || 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const updateGateway = (gateway, field, value) => {
    setGatewaySettings(prev => ({
      ...prev,
      [gateway]: {
        ...prev[gateway],
        [field]: value
      }
    }));
  };

  const GatewayField = ({ gateway, field, label, type = "text" }) => (
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">{label}</Label>
      <input
        type={type}
        className="flex h-12 w-full rounded-xl border border-border bg-secondary/30 px-4 py-2 text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
        value={gatewaySettings[gateway][field]}
        onChange={(e) => updateGateway(gateway, field, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative">
          <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 text-primary uppercase font-calibri-bold">Global Params</h2>
          <p className="text-muted-foreground font-medium text-lg opacity-70 font-calibri text-shadow-sm">"Configuring system-wide behaviors and public entity visibility."</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchSettings}
          disabled={loading}
          className="rounded-2xl border-border bg-card/50 backdrop-blur-xl h-14 px-6 font-black uppercase tracking-widest text-xs gap-2 hover:bg-secondary transition-all"
        >
          <RefreshCw className={cn("w-4 h-4 text-primary", loading && "animate-spin")} />
          Sync Repository
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-secondary/50 p-1 rounded-2xl mb-8">
          <TabsTrigger value="general" className="rounded-xl px-8 py-3 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-xs">
            General Configuration
          </TabsTrigger>
          <TabsTrigger value="branding" className="rounded-xl px-8 py-3 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-xs">
            Branding
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-xl px-8 py-3 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-xs">
            Payment Options
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Website Visibility Card */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
              <CardHeader className="p-10 pb-4">
                <div className="flex items-center gap-5 mb-2">
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10 transition-transform">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Public Facing</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground font-calibri">Digital storefront & booking engine control</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-8">
                <div className="flex items-center justify-between p-8 rounded-[2rem] bg-secondary/20 border border-border/50 group transition-all hover:bg-secondary/30">
                  <div className="space-y-2">
                    <Label className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                      <Radio className={cn("h-3 w-3", websiteEnabled ? "text-emerald-500 animate-pulse" : "text-rose-500")} />
                      Booking Portal status
                    </Label>
                    <p className="text-sm font-medium text-muted-foreground max-w-[320px] leading-relaxed opacity-70 font-calibri">
                      Toggle the public-facing landing page and cloud reservation engine. Immediate effect on DNS routing.
                    </p>
                  </div>
                  <Switch
                    checked={websiteEnabled}
                    onCheckedChange={handleToggle}
                    disabled={loading}
                    className="scale-150 data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-4 items-start shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-amber-700/80 font-calibri-bold">Critical Advisory</p>
                    <p className="text-sm font-bold text-amber-700/60 leading-relaxed font-calibri">
                      Disabling the portal redirects all traffic to the legacy maintenance screen. Administrative access remains unaffected via direct VPC routes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Points Configuration Card */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
              <CardHeader className="p-10 pb-4">
                <div className="flex items-center gap-5 mb-2">
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/10">
                    <Coins className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Loyalty System</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground font-calibri">Customer rewards & point valuations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-8">
                <div className="flex items-center justify-between p-8 rounded-[2rem] bg-secondary/20 border border-border/50 group transition-all hover:bg-secondary/30">
                  <div className="space-y-2">
                    <Label className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                      Enable Loyalty Points
                    </Label>
                    <p className="text-sm font-medium text-muted-foreground max-w-[320px] leading-relaxed opacity-70 font-calibri">
                      Globally activate or deactivate the accrual and redemption of loyalty points.
                    </p>
                  </div>
                  <Switch
                    checked={loyaltyEnabled}
                    onCheckedChange={setLoyaltyEnabled}
                    className="scale-150 data-[state=checked]:bg-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Earn Value (1 Point = X LKR)</Label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      className="flex h-14 w-full rounded-2xl border border-border bg-secondary/30 px-6 py-2 text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={loyaltyEarnRate}
                      onChange={(e) => setLoyaltyEarnRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Redeem Value (1 Point = X LKR)</Label>
                    <input
                      type="number"
                      placeholder="e.g. 1"
                      className="flex h-14 w-full rounded-2xl border border-border bg-secondary/30 px-6 py-2 text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={loyaltyRedeemRate}
                      onChange={(e) => setLoyaltyRedeemRate(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveLoyaltySettings}
                  disabled={saving}
                  className="w-full h-16 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 font-calibri-bold"
                >
                  {saving ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Save Loyalty Configuration
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Maintenance Configuration Card */}
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300">
              <CardHeader className="p-10 pb-4">
                <div className="flex items-center gap-5 mb-2">
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/10">
                    <ShieldAlert className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Staging Alert</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground font-calibri">Maintenance mode screen personalization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4 space-y-8">
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heading" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Hero Heading</Label>
                    <input
                      id="heading"
                      type="text"
                      placeholder="e.g. SYSTEM UPGRADE IN PROGRESS"
                      className="flex h-14 w-full rounded-2xl border border-border bg-secondary/30 px-6 py-2 text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                      value={maintenanceHeading}
                      onChange={(e) => setMaintenanceHeading(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Event Description</Label>
                    <textarea
                      id="message"
                      placeholder="We are currently rebalancing fleet logistics modules..."
                      className="flex min-h-[120px] w-full rounded-2xl border border-border bg-secondary/30 px-6 py-4 text-base font-bold text-foreground focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-6 px-8 rounded-2xl bg-secondary/10 border border-border/50">
                    <div className="space-y-1">
                      <Label className="text-xs font-black uppercase tracking-widest text-foreground">Admin Overpass</Label>
                      <p className="text-sm font-bold text-muted-foreground opacity-60 font-calibri">Authorize administrative sessions during blackout</p>
                    </div>
                    <Switch
                      checked={allowLogin}
                      onCheckedChange={setAllowLogin}
                      className="scale-125"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleSaveMaintenanceSettings}
                    disabled={saving}
                    className="w-full h-16 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 font-calibri-bold"
                  >
                    {saving ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Authorize Registry Flash
                      </>
                    )}
                  </Button>

                  {['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role) && (
                    <div className="flex flex-col gap-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsWizardOpen(true)}
                          className="w-full h-14 rounded-2xl border-dashed border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 font-calibri-bold"
                        >
                          <Database className="h-5 w-5" />
                          Load Demo Data
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsRemoveWizardOpen(true)}
                          className="w-full h-14 rounded-2xl border-dashed border-2 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 font-calibri-bold"
                        >
                          <Trash2 className="h-5 w-5" />
                          Remove Demo Data
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        onClick={() => setIsDeleteAllWizardOpen(true)}
                        className="w-full h-14 rounded-2xl border-2 border-rose-600 bg-rose-600 text-white hover:bg-rose-700 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 font-calibri-bold shadow-lg shadow-rose-600/20"
                      >
                        <ShieldAlert className="h-5 w-5" />
                        Delete All Data (Permanent Wipe)
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-2xl">
            <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-10 pb-4">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10">
                    <Palette className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Visual Identity</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground font-calibri">Manage public website branding and logos</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="bg-secondary/20 p-8 rounded-[2rem] border border-border/50">
                    <ImageUploadPreview
                      id="website-logo"
                      label="Website Logo"
                      file={websiteLogo}
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setWebsiteLogo(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      onRemove={() => setWebsiteLogo(null)}
                    />
                    <p className="mt-4 text-xs font-bold text-muted-foreground opacity-60 font-calibri">
                      Recommended size: 500x150px. Transparent PNG preferred for dark mode compatibility.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveBranding}
                  disabled={saving}
                  className="w-full h-16 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  {saving ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      Synchronize Branding
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-10 pb-4">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/10">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black uppercase tracking-tighter text-foreground font-calibri-bold">Payment Gateways</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground font-calibri">Configure online payment infrastructure for Sri Lanka</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <Accordion type="single" collapsible className="w-full space-y-4">
                {/* PayHere */}
                <AccordionItem value="payhere" className="border-none bg-secondary/20 rounded-3xl px-8 py-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="p-2 bg-card rounded-xl">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-foreground">PayHere</p>
                        <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Official LKR Gateway</p>
                      </div>
                      <Switch
                        checked={gatewaySettings.payhere.enabled}
                        onCheckedChange={(checked) => updateGateway('payhere', 'enabled', checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-6 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-8 border-t border-border mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GatewayField gateway="payhere" field="merchantId" label="Merchant ID" />
                      <GatewayField gateway="payhere" field="secret" label="Secret Key" type="password" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* WebExPay */}
                <AccordionItem value="webexpay" className="border-none bg-secondary/20 rounded-3xl px-8 py-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="p-2 bg-card rounded-xl">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-foreground">WebExPay</p>
                        <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Ecommerce Solution</p>
                      </div>
                      <Switch
                        checked={gatewaySettings.webexpay.enabled}
                        onCheckedChange={(checked) => updateGateway('webexpay', 'enabled', checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-6 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-8 border-t border-border mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GatewayField gateway="webexpay" field="merchantId" label="Merchant ID" />
                      <GatewayField gateway="webexpay" field="apiKey" label="API Key" type="password" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* OnePay */}
                <AccordionItem value="onepay" className="border-none bg-secondary/20 rounded-3xl px-8 py-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="p-2 bg-card rounded-xl">
                        <Radio className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-foreground">OnePay</p>
                        <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">LankaQR Integration</p>
                      </div>
                      <Switch
                        checked={gatewaySettings.onepay.enabled}
                        onCheckedChange={(checked) => updateGateway('onepay', 'enabled', checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-6 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-8 border-t border-border mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GatewayField gateway="onepay" field="appId" label="App ID" />
                      <GatewayField gateway="onepay" field="hashKey" label="Hash Key" type="password" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* DirectPay */}
                <AccordionItem value="directpay" className="border-none bg-secondary/20 rounded-3xl px-8 py-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="p-2 bg-card rounded-xl">
                        <Settings2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-foreground">Direct Pay</p>
                        <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Custom Merchant Flow</p>
                      </div>
                      <Switch
                        checked={gatewaySettings.directpay.enabled}
                        onCheckedChange={(checked) => updateGateway('directpay', 'enabled', checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-6 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-8 border-t border-border mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GatewayField gateway="directpay" field="clientId" label="Client ID" />
                      <GatewayField gateway="directpay" field="secret" label="Secret Key" type="password" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Genie */}
                <AccordionItem value="genie" className="border-none bg-secondary/20 rounded-3xl px-8 py-2">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 w-full text-left">
                      <div className="p-2 bg-card rounded-xl">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black uppercase tracking-widest text-foreground">Genie</p>
                        <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Dialog Payments</p>
                      </div>
                      <Switch
                        checked={gatewaySettings.genie.enabled}
                        onCheckedChange={(checked) => updateGateway('genie', 'enabled', checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-6 data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-8 border-t border-border mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <GatewayField gateway="genie" field="merchantId" label="Merchant ID" />
                      <GatewayField gateway="genie" field="secretKey" label="Secret Key" type="password" />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* KOKO & Mintpay */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-secondary/20 rounded-3xl p-6 border border-border/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-foreground">KOKO</p>
                      <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Buy Now Pay Later</p>
                    </div>
                    <Switch
                      checked={gatewaySettings.koko.enabled}
                      onCheckedChange={(checked) => updateGateway('koko', 'enabled', checked)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="bg-secondary/20 rounded-3xl p-6 border border-border/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-foreground">Mintpay</p>
                      <p className="text-sm font-medium text-muted-foreground opacity-70 font-calibri">Interest-free split</p>
                    </div>
                    <Switch
                      checked={gatewaySettings.mintpay.enabled}
                      onCheckedChange={(checked) => updateGateway('mintpay', 'enabled', checked)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              </Accordion>

              <Button
                onClick={handleSavePaymentSettings}
                disabled={saving}
                className="w-full h-16 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {saving ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Update Payment Repository
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DemoDataWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
      />
      <RemoveDataWizard
        open={isRemoveWizardOpen}
        onOpenChange={setIsRemoveWizardOpen}
      />
      <DeleteAllDataWizard
        open={isDeleteAllWizardOpen}
        onOpenChange={setIsDeleteAllWizardOpen}
      />
    </div>
  );
};

export default GeneralSettings;
