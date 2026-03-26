import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  User, SlidersHorizontal, Languages, GraduationCap,
  HelpCircle, LogOut, Check, Zap, Pencil, Loader2, ArrowLeft,
} from 'lucide-react';
import { api, tokenStorage } from '../lib/api';
import { AppHeader } from '../components/layout/AppHeader';
import { CustomSelect } from '../components/ui/CustomSelect';
import type { EducationLevel, Language } from '../types/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  user: any;
  onUserUpdate: (user: any) => void;
  onSignOut: () => void;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: 'elementary',    label: 'Elementary'    },
  { value: 'middle_school', label: 'Middle School' },
  { value: 'high_school',   label: 'High School'   },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate',      label: 'Graduate'      },
  { value: 'professional',  label: 'Professional'  },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English (US)'     },
  { value: 'fr', label: 'French (FR)'      },
  { value: 'es', label: 'Spanish (ES)'     },
  { value: 'ar', label: 'Arabic (AR)'      },
  { value: 'zh', label: 'Chinese (ZH)'     },
  { value: 'hi', label: 'Hindi (HI)'       },
  { value: 'pt', label: 'Portuguese (PT)'  },
  { value: 'de', label: 'German (DE)'      },
  { value: 'ja', label: 'Japanese (JA)'    },
  { value: 'ko', label: 'Korean (KO)'      },
  { value: 'km', label: 'Khmer (KM)'       },
];

const SIDEBAR_ITEMS = [
  { id: 'account',        label: 'Account',        Icon: User            },
  { id: 'preferences',    label: 'Preferences',    Icon: SlidersHorizontal },
  { id: 'language',       label: 'Language',       Icon: Languages       },
  { id: 'academic-level', label: 'Academic Level', Icon: GraduationCap   },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, color = 'bg-primary' }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <div className={`w-14 h-7 bg-surface-container-highest rounded-full peer
        peer-checked:after:translate-x-full
        after:content-[''] after:absolute after:top-1 after:left-1
        after:bg-on-surface after:rounded-full after:h-5 after:w-5 after:transition-all
        peer-checked:${color}`}
      />
    </label>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage({ user, onUserUpdate, onSignOut, onBack }: Props) {
  const [activeSection, setActiveSection] = useState('account');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.upload<{ user: any }>('/api/users/avatar', formData);
      onUserUpdate(res.user);
    } catch {
      setAvatarPreview(null); // revert preview on error
    } finally {
      setUploadingAvatar(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Form state
  const [fullName, setFullName]               = useState<string>(user?.full_name ?? '');
  const [educationLevel, setEducationLevel]   = useState<EducationLevel>(user?.education_level ?? 'high_school');
  const [language, setLanguage]               = useState<Language>(user?.language ?? 'en');
  const [deepDiveMode, setDeepDiveMode]       = useState<boolean>(user?.preferences?.ai_explanation_style === 'detailed');
  const [visualMapGen, setVisualMapGen]       = useState<boolean>((user?.preferences?.preferred_subjects?.length ?? 0) > 0);
  const [aiVoice, setAiVoice]                 = useState<boolean>(user?.preferences?.ai_voice ?? true);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const [profileRes] = await Promise.all([
        api.patch<{ user: any; accessToken: string }>('/api/users/profile', {
          full_name: fullName,
          education_level: educationLevel,
          language,
        }),
        api.patch('/api/users/preferences', {
          ai_explanation_style: deepDiveMode ? 'detailed' : 'simple',
          ai_voice: aiVoice,
        }),
      ]);
      // Replace stored access token so future AI requests use the updated language
      const refresh = tokenStorage.getRefresh();
      if (profileRes.accessToken && refresh) {
        tokenStorage.setTokens(profileRes.accessToken, refresh, profileRes.user);
      }
      onUserUpdate(profileRes.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setFullName(user?.full_name ?? '');
    setEducationLevel(user?.education_level ?? 'high_school');
    setLanguage(user?.language ?? 'en');
    setDeepDiveMode(false);
    setVisualMapGen(false);
    setAiVoice(true);
  };

  const handleCancel = () => {
    setFullName(user?.full_name ?? '');
    setEducationLevel(user?.education_level ?? 'high_school');
    setLanguage(user?.language ?? 'en');
    setDeepDiveMode(user?.preferences?.ai_explanation_style === 'detailed');
    setVisualMapGen((user?.preferences?.preferred_subjects?.length ?? 0) > 0);
    setAiVoice(user?.preferences?.ai_voice ?? true);
    onBack();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Ambient glows */}
      <div className="fixed top-1/4 -right-20 w-96 h-96 bg-secondary-container/10 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 -left-20 w-96 h-96 bg-primary-container/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <AppHeader user={user} />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-64 bg-surface-container-low hidden sm:flex flex-col py-8 px-4 gap-2">
        <div className="mb-6 px-4">
          <h2 className="text-xl font-headline font-bold text-on-surface">Settings</h2>
          <p className="text-xs text-on-surface-variant opacity-70 mt-1">Manage your AI tutor</p>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {SIDEBAR_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={[
                'flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:translate-x-1 text-left',
                activeSection === id
                  ? 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary border-r-2 border-primary'
                  : 'text-on-surface-variant opacity-80 hover:bg-surface-container-highest hover:opacity-100',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-4 mt-auto border-t border-outline-variant/20 flex flex-col gap-1">
          <a href="#" className="flex items-center gap-3 py-3 px-4 rounded-lg text-on-surface-variant opacity-80 text-sm font-medium hover:bg-surface-container-highest hover:opacity-100 transition-all duration-200 hover:translate-x-1">
            <HelpCircle className="w-4 h-4" />
            Help
          </a>
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 py-3 px-4 rounded-lg text-on-surface-variant opacity-80 text-sm font-medium hover:bg-surface-container-highest hover:opacity-100 transition-all duration-200 hover:translate-x-1 text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="sm:ml-64 pt-24 pb-24 sm:pb-12 px-6 lg:px-12 max-w-7xl mx-auto">
        <header className="mb-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface mb-2">
            User Settings
          </h1>
          <p className="text-on-surface-variant max-w-2xl">
            Calibrate your neural learning environment. Every change here informs how the Zupiq AI interacts with your cognitive profile.
          </p>
          <button
            onClick={onSignOut}
            className="sm:hidden mt-6 inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column ─────────────────────────────────────────────── */}
          <section className="lg:col-span-8 space-y-8">
            {/* Account Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card glow-corner p-8 rounded-3xl relative overflow-hidden"
            >
              <h3 className="font-headline text-xl font-bold text-primary mb-8 flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Management
              </h3>

              <div className="flex flex-col md:flex-row gap-10 items-start">
                {/* Avatar */}
                <div className="relative group flex-shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary">
                    <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center border-4 border-surface-container overflow-hidden">
                      {(avatarPreview || user?.avatar_url) ? (
                        <img
                          src={avatarPreview ?? user.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : null}
                      {!(avatarPreview || user?.avatar_url) && (
                        <span className="text-3xl font-bold text-on-surface">
                          {(user?.full_name ?? user?.email ?? 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 p-2 bg-surface-container-highest text-primary rounded-full shadow-lg border border-outline-variant/30 hover:scale-110 transition-transform disabled:opacity-60"
                    title="Change profile picture"
                  >
                    {uploadingAvatar
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Pencil className="w-4 h-4" />
                    }
                  </button>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-widest">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-transparent border-b-2 border-outline-variant focus:border-primary focus:outline-none text-on-surface py-2 px-1 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-2 ml-1 uppercase tracking-widest">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email ?? ''}
                      readOnly
                      className="w-full bg-transparent border-b-2 border-outline-variant/40 text-on-surface-variant py-2 px-1 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Learning Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card glow-corner p-8 rounded-3xl"
            >
              <h3 className="font-headline text-xl font-bold text-secondary mb-8 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5" />
                Learning Preferences
              </h3>

              <div className="space-y-4">
                {/* Deep Dive Mode */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                  <div>
                    <h4 className="font-bold text-on-surface">Deep Dive Mode</h4>
                    <p className="text-sm text-on-surface-variant">Prioritize technical depth over general overviews</p>
                  </div>
                  <Toggle checked={deepDiveMode} onChange={setDeepDiveMode} color="bg-primary" />
                </div>

                {/* Visual Map Generation */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                  <div>
                    <h4 className="font-bold text-on-surface">Visual Map Generation</h4>
                    <p className="text-sm text-on-surface-variant">Automatically generate 3D knowledge clusters</p>
                  </div>
                  <Toggle checked={visualMapGen} onChange={setVisualMapGen} color="bg-secondary" />
                </div>

                {/* AI Voice Feedback */}
                <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                  <div>
                    <h4 className="font-bold text-on-surface">AI Voice Feedback</h4>
                    <p className="text-sm text-on-surface-variant">Enable conversational auditory tutoring sessions</p>
                  </div>
                  <Toggle checked={aiVoice} onChange={setAiVoice} color="bg-tertiary-fixed" />
                </div>
              </div>
            </motion.div>
          </section>

          {/* ── Right Column ────────────────────────────────────────────── */}
          <section className="lg:col-span-4 space-y-8">
            {/* Academic Level */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6 rounded-3xl"
            >
              <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Academic Level</h3>
              <div className="space-y-2">
                {EDUCATION_LEVELS.map(({ value, label }) => {
                  const isActive = educationLevel === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setEducationLevel(value)}
                      className={[
                        'w-full p-4 rounded-xl text-left flex items-center justify-between transition-all',
                        isActive
                          ? 'border-2 border-primary bg-primary/10'
                          : 'border border-outline-variant/30 hover:border-primary/50',
                      ].join(' ')}
                    >
                      <span className={isActive ? 'text-on-surface font-bold' : 'text-on-surface-variant'}>
                        {label}
                      </span>
                      {isActive && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Interface Language */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 rounded-3xl"
            >
              <h3 className="font-headline text-lg font-bold text-on-surface mb-6">Interface Language</h3>
              <CustomSelect
                variant="card"
                options={LANGUAGES}
                value={language}
                onChange={v => setLanguage(v as Language)}
              />
            </motion.div>

            {/* Neural Sync Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6 rounded-3xl bg-gradient-to-br from-surface-variant to-surface-container overflow-hidden relative"
            >
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
              <h3 className="font-headline text-sm font-bold text-tertiary mb-4 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Neural Sync Status
              </h3>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-bold text-on-surface">94%</span>
                <span className="text-primary text-sm font-medium mb-1.5">+2.4% this week</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-4">
                <div
                  className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary rounded-full"
                  style={{ width: '94%' }}
                />
              </div>
            </motion.div>
          </section>
        </div>

        {/* ── Footer Actions ──────────────────────────────────────────────── */}
        <div className="mt-16 flex items-center justify-between pt-8 border-t border-outline-variant/20">
          <button
            onClick={handleRestoreDefaults}
            className="text-on-surface-variant font-medium hover:text-on-surface px-6 py-3 rounded-full transition-all"
          >
            Restore Factory Defaults
          </button>
          <div className="flex items-center gap-4">
            {saveError && (
              <p className="text-sm text-error">{saveError}</p>
            )}
            <button
              onClick={handleCancel}
              className="px-8 py-3 rounded-full font-medium text-on-surface hover:bg-surface-variant transition-all backdrop-blur-md border border-outline-variant/30"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-10 py-3 rounded-full font-bold text-on-primary bg-gradient-to-r from-primary to-secondary shadow-[0_0_30px_rgba(161,250,255,0.3)] hover:shadow-[0_0_50px_rgba(161,250,255,0.5)] active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </main>

      {/* Floating AI Orb */}
      <div className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-primary-container flex items-center justify-center cursor-pointer shadow-[0_0_40px_rgba(0,244,254,0.4)] group z-40">
        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
        <Zap className="w-6 h-6 text-on-primary-container group-hover:rotate-12 transition-transform" />
      </div>
    </div>
  );
}
