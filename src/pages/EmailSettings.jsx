import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateKey, setTemplateKey] = useState('WELCOME');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [newTemplateKey, setNewTemplateKey] = useState('');

  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: '',
    username: '',
    password: '',
    encryption: 'TLS',
    from_email: '',
    from_name: '',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/email-settings');
      const settings = res.data?.settings;
      if (settings) {
        setForm({
          smtp_host: settings.smtpHost || '',
          smtp_port: String(settings.smtpPort ?? ''),
          username: settings.username || '',
              // Password is intentionally NOT returned from the API for security.
              // Leave it empty unless the user wants to change it.
              password: '',
          encryption: settings.encryption || 'TLS',
          from_email: settings.fromEmail || '',
          from_name: settings.fromName || '',
        });
      }
    } catch (e) {
      // If settings don't exist yet, the backend returns {settings:null}
      const msg = e.response?.data?.message || 'Failed to load email settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      setError('');
      const res = await api.get('/email-templates');
      const list = res.data?.templates || [];
      setTemplates(list);

      // Initialize editor with current selected key if possible.
      const found = list.find(t => String(t.templateKey).toUpperCase() === String(templateKey).toUpperCase()) || list[0];
      if (found) {
        setTemplateKey(found.templateKey);
        setTemplateSubject(found.subjectTemplate || '');
        setTemplateHtml(found.htmlTemplate || '');
      }
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to load email templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await api.put('/email-settings', {
        smtp_host: form.smtp_host,
        smtp_port: Number(form.smtp_port),
        username: form.username,
        password: form.password,
        encryption: form.encryption,
        from_email: form.from_email,
        from_name: form.from_name,
      });
      await fetchSettings();
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save email settings';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setError('');
      setTestResult('');
      const res = await api.post('/email-settings/test', {
        smtp_host: form.smtp_host,
        smtp_port: Number(form.smtp_port),
        username: form.username,
        password: form.password,
        encryption: form.encryption,
      });
      setTestResult(res.data?.message || 'SMTP connection verified.');
    } catch (e) {
      const msg = e.response?.data?.message || 'SMTP connection test failed.';
      setTestResult(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleTemplateSelect = (key) => {
    setTemplateKey(key);
    const found = templates.find(t => String(t.templateKey).toUpperCase() === String(key).toUpperCase());
    if (found) {
      setTemplateSubject(found.subjectTemplate || '');
      setTemplateHtml(found.htmlTemplate || '');
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setTemplateSaving(true);
      setError('');
      await api.put(`/email-templates/${templateKey}`, {
        subject: templateSubject,
        html: templateHtml
      });
      await fetchTemplates();
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to save template');
    } finally {
      setTemplateSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-foreground tracking-tighter mb-2 text-primary uppercase font-calibri-bold">
            Email SMTP Settings
          </h2>
          <p className="text-muted-foreground font-medium text-lg opacity-70">
            Configure outgoing mail server for welcome emails and future notifications.
          </p>
        </div>
        <Button variant="outline" onClick={fetchSettings} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Card className="bg-card border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-10 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <CardTitle className="text-3xl font-black uppercase tracking-widest text-foreground">Email Notifications</CardTitle>
              <CardDescription className="mt-2 text-muted-foreground font-medium">
                SMTP configuration + editable email templates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-10 pt-0">
          {error && (
            <div className="border border-red-500/30 bg-red-500/5 text-red-700 rounded-2xl px-4 py-3 mb-6">
              <div className="font-black uppercase tracking-widest text-[10px] mb-1">Settings Error</div>
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <Tabs defaultValue="smtp" className="w-full">
            <TabsList className="bg-secondary/50 p-1 rounded-2xl mb-8 w-full flex justify-start gap-2">
              <TabsTrigger value="smtp" className="rounded-xl px-8 py-3 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-xs">
                SMTP Settings
              </TabsTrigger>
              <TabsTrigger value="templates" className="rounded-xl px-8 py-3 data-[state=active]:bg-card data-[state=active]:shadow-lg font-black uppercase tracking-widest text-xs">
                Email Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="smtp">
              {testResult && (
                <div
                  className={`border rounded-2xl px-4 py-3 mb-6 ${
                    testResult.toLowerCase().includes('verified') || testResult.toLowerCase().includes('ok')
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800'
                      : 'border-red-500/30 bg-red-500/5 text-red-700'
                  }`}
                >
                  <div className="font-black uppercase tracking-widest text-[10px] mb-1">
                    SMTP Test Result
                  </div>
                  <div className="text-sm font-medium">{testResult}</div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">SMTP Host *</Label>
                  <Input
                    value={form.smtp_host}
                    onChange={(e) => handleChange('smtp_host', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="smtp.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">SMTP Port *</Label>
                  <Input
                    value={form.smtp_port}
                    onChange={(e) => handleChange('smtp_port', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="587"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">SMTP Username *</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="your-smtp-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">SMTP Password</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="••••••••••"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    If left empty, the existing password will be kept.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Encryption *</Label>
                  <Select value={form.encryption} onValueChange={(val) => handleChange('encryption', val)}>
                    <SelectTrigger className="bg-secondary/50 border-border rounded-2xl h-12">
                      <SelectValue placeholder="Select encryption" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border">
                      <SelectItem value="TLS">TLS</SelectItem>
                      <SelectItem value="SSL">SSL</SelectItem>
                      <SelectItem value="NONE">NONE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">From Email *</Label>
                  <Input
                    value={form.from_email}
                    onChange={(e) => handleChange('from_email', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="no-reply@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">From Name *</Label>
                  <Input
                    value={form.from_name}
                    onChange={(e) => handleChange('from_name', e.target.value)}
                    className="bg-secondary/50 border-border rounded-2xl"
                    placeholder="Cruiser Cabs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-10">
                <Button variant="outline" onClick={handleTestConnection} disabled={testing || saving || loading}>
                  {testing ? 'Testing...' : 'Test SMTP Connection'}
                </Button>
                <Button variant="outline" onClick={fetchSettings} disabled={saving || loading}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Template Key</Label>
                  <Select
                    value={templateKey}
                    onValueChange={(val) => handleTemplateSelect(val)}
                    disabled={templatesLoading}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border rounded-2xl h-12">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border">
                      {(templates || []).map(t => (
                        <SelectItem key={t.templateKey} value={t.templateKey}>{t.templateKey}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="pt-3 border-t border-border/50">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Create New Template Key</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newTemplateKey}
                        onChange={(e) => setNewTemplateKey(e.target.value)}
                        placeholder="e.g. BOOKING_CONFIRMATION_2"
                        className="bg-secondary/50 border-border rounded-2xl"
                        disabled={templatesLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const key = String(newTemplateKey || '').trim().toUpperCase();
                          if (!key) return;
                          setTemplateKey(key);
                          setTemplateSubject('');
                          setTemplateHtml('');
                          setNewTemplateKey('');
                        }}
                        disabled={templatesLoading}
                      >
                        Use
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Save will create the template in DB.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Placeholders</Label>
                  <div className="border border-border bg-secondary/20 rounded-2xl p-4 text-[12px] leading-relaxed text-muted-foreground font-medium">
                    <div className="font-black text-foreground mb-2 uppercase tracking-widest text-[10px]">Available examples</div>
                    <div>{`{customer_name}`}, {`{booking_reference}`}, {`{booking_datetime}`}</div>
                    <div className="mt-2">{`{invoice_no}`}, {`{contract_no}`}, {`{invoice_total}`}, {`{invoice_link}`}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-8">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Subject Template</Label>
                <Input
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="bg-secondary/50 border-border rounded-2xl"
                />
              </div>

              <div className="space-y-2 mt-6">
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">HTML Content Template</Label>
                <Textarea
                  value={templateHtml}
                  onChange={(e) => setTemplateHtml(e.target.value)}
                  className="min-h-[260px] bg-secondary/50 border-border rounded-2xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Keep valid HTML. You can use placeholders like <b>{"{customer_name}"}</b>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-10">
                <Button variant="outline" onClick={fetchTemplates} disabled={templateSaving || templatesLoading}>
                  Refresh
                </Button>
                <Button onClick={handleSaveTemplate} disabled={templateSaving || templatesLoading}>
                  {templateSaving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

