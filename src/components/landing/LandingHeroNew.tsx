import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import tradingHeroBg from '@/assets/home-banner-img.png';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import defaultHomePageContent from '@/config/homePagecontent.json';
import { useHomePageContent, type HomePageContent } from '@/hooks/useHomePageContent';
import { Link } from 'react-router-dom';

const LandingHeroNew = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { content, loading } = useHomePageContent();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<HomePageContent>(() => ({
    ...defaultHomePageContent
  }));
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEditorOpen) return;

    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
    }

    previewTimerRef.current = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('home_page_content_updated', {
          detail: { ...defaultHomePageContent, ...(draft ?? {}) }
        })
      );
    }, 150);

    return () => {
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, [draft, isEditorOpen]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    const payload = JSON.stringify({ ...defaultHomePageContent, ...(draft ?? {}) });

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'home_page_content',
          value: payload,
          description: 'Home page content JSON'
        },
        { onConflict: 'key' }
      );

    setIsSaving(false);
    if (!error) {
      window.dispatchEvent(
        new CustomEvent('home_page_content_updated', {
          detail: { ...defaultHomePageContent, ...(draft ?? {}) }
        })
      );
      setIsEditorOpen(false);
    }
  };

  const merged = useMemo(() => {
    return {
      ...defaultHomePageContent,
      ...(content ?? {})
    } as HomePageContent;
  }, [content]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { page?: string } | undefined;
      if (detail?.page !== 'home') return;
      if (!user || roleLoading || !isAdmin()) return;
      setDraft({ ...defaultHomePageContent, ...merged });
      setIsEditorOpen(true);
    };

    window.addEventListener('openPageEditor', handler as EventListener);
    return () => window.removeEventListener('openPageEditor', handler as EventListener);
  }, [isAdmin, merged, roleLoading, user]);

  if (loading) {
    return <section className="relative flex min-h-screen items-center justify-center overflow-hidden" />;
  }

  const heroTitle = merged.heroTitle ?? '';
  const heroHighlight = merged.heroHighlight ?? '';
  const heroSubtitle = merged.heroSubtitle ?? '';
  const heroCtaPrimaryLabel = merged.heroCtaPrimaryLabel ?? '';
  const heroCtaPrimaryLink = merged.heroCtaPrimaryLink ?? '/auth?mode=signup';
  const heroCtaSecondaryLabel = merged.heroCtaSecondaryLabel ?? '';
  const heroCtaSecondaryLink = merged.heroCtaSecondaryLink ?? '/downloads';

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* Background */}
      <div
        className="hero-bg absolute inset-0"
        style={{
          backgroundImage: `url(${tradingHeroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-0 text-center">
        <div className="grid items-center gap-12">
          <div className="w-full max-w-3xl text-left">
            <h1 className="mb-6 font-inter font-bold uppercase text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
              {heroTitle}{' '}
              <span className="text-[var(--yellowcolor)]">{heroHighlight}</span>
            </h1>

            <p className="mb-8 max-w-2xl font-inter text-lg md:text-[20px] text-white">
              {heroSubtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              {/* Show ONLY if user is NOT logged in */}
              {!user && (
                <Link
                  to={heroCtaPrimaryLink}
                  className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]"
                >
                  <Button className="block h-[45px] rounded-[10px] bg-black px-6 text-xs font-semibold uppercase text-white hover:bg-gradient-pink-to-yellow">
                    {heroCtaPrimaryLabel}
                  </Button> 
                </Link>
              )}

              <Link
                to={heroCtaSecondaryLink}
                className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]"
              >
                <Button className="block h-[45px] rounded-[10px] bg-gradient-yellow-to-pink px-6 text-xs font-semibold uppercase text-white">
                  {heroCtaSecondaryLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {user && !roleLoading && isAdmin() && (
        <>
          <div
            className={`fixed inset-0 z-[70] bg-black/70 transition-opacity ${
              isEditorOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />

          <aside
            className={`fixed right-0 top-0 z-[80] h-full w-full max-w-md transform bg-[#2e2e2e] text-black shadow-2xl transition-transform duration-300 ${
              isEditorOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            aria-label="Edit Home Page"
          >
            <div className="flex items-center justify-between border-0 border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Edit Home Page</h2>
              <Button
                size="sm"
                variant="outline"
                className="text-black border-0 rounded-[8px] bg-white/10 hover:bg-white/20"
                onClick={() => setIsEditorOpen(false)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>

            <div
              className="space-y-4 px-6 pt-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
              style={{ height: 'calc(100vh - 157px)' }}
            >
              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                <h3 className="text-white font-semibold">Banner Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title</Label>
                <Input
                  value={draft.heroTitle ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-0 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Highlight</Label>
                <Input
                  value={draft.heroHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Subtitle</Label>
                <Textarea
                  value={draft.heroSubtitle ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Primary Button Label</Label>
                <Input
                  value={draft.heroCtaPrimaryLabel ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroCtaPrimaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Primary Button Link</Label>
                <Input
                  value={draft.heroCtaPrimaryLink ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroCtaPrimaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Secondary Button Label</Label>
                <Input
                  value={draft.heroCtaSecondaryLabel ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroCtaSecondaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Secondary Button Link</Label>
                <Input
                  value={draft.heroCtaSecondaryLink ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      heroCtaSecondaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Stats Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Image 1 (URL)</Label>
                <Input
                  value={draft.home_stats_image_1 ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      home_stats_image_1: event.target.value
                    }))
                  }
                  placeholder="https://..."
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">AUM Value</Label>
                <Input
                  value={draft.stats_aum_value ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_aum_value: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">AUM Label</Label>
                <Input
                  value={draft.stats_aum_label ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_aum_label: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Investors Value</Label>
                <Input
                  value={draft.stats_investors_value ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, stats_investors_value: e.target.value }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Investors Label</Label>
                <Input
                  value={draft.stats_investors_label ?? ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, stats_investors_label: e.target.value }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Uptime Value</Label>
                <Input
                  value={draft.stats_uptime_value ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_uptime_value: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Uptime Label</Label>
                <Input
                  value={draft.stats_uptime_label ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_uptime_label: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Support Value</Label>
                <Input
                  value={draft.stats_support_value ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_support_value: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Support Label</Label>
                <Input
                  value={draft.stats_support_label ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, stats_support_label: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Community Title</Label>
                <Input
                  value={draft.community_title ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, community_title: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Community Description</Label>
                <Textarea
                  value={draft.community_description ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, community_description: e.target.value }))}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={4}
                />
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Features Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Yellow)</Label>
                <Input
                  value={draft.features_section?.titleYellow ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      features_section: {
                        ...(prev.features_section ?? defaultHomePageContent.features_section),
                        titleYellow: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (White)</Label>
                <Input
                  value={draft.features_section?.titleWhite ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      features_section: {
                        ...(prev.features_section ?? defaultHomePageContent.features_section),
                        titleWhite: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Subtitle</Label>
                <Textarea
                  value={draft.features_section?.subtitle ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      features_section: {
                        ...(prev.features_section ?? defaultHomePageContent.features_section),
                        subtitle: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={5}
                />
              </div>

              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`feature-card-${index}`} className="space-y-3 rounded-lg border border-white/10 p-4 bg-black/20 inline-block w-full">
                  <div className="text-white/90 font-semibold">Card {index + 1}</div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Icon URL (optional)</Label>
                    <Input
                      value={draft.features_section?.cards?.[index]?.iconUrl ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.features_section ?? defaultHomePageContent.features_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { iconUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, iconUrl: event.target.value };
                          return {
                            ...prev,
                            features_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      placeholder="https://..."
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Title</Label>
                    <Input
                      value={draft.features_section?.cards?.[index]?.title ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.features_section ?? defaultHomePageContent.features_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { iconUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, title: event.target.value };
                          return {
                            ...prev,
                            features_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Description</Label>
                    <Textarea
                      value={draft.features_section?.cards?.[index]?.description ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.features_section ?? defaultHomePageContent.features_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { iconUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, description: event.target.value };
                          return {
                            ...prev,
                            features_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                      rows={5}
                    />
                  </div>
                </div>
              ))}

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Faith &amp; Finances Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Before Highlight)</Label>
                <Input
                  value={draft.faith_finance_section?.titleBeforeHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      faith_finance_section: {
                        ...(prev.faith_finance_section ?? defaultHomePageContent.faith_finance_section),
                        titleBeforeHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Highlight)</Label>
                <Input
                  value={draft.faith_finance_section?.titleHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      faith_finance_section: {
                        ...(prev.faith_finance_section ?? defaultHomePageContent.faith_finance_section),
                        titleHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Body</Label>
                <Textarea
                  value={draft.faith_finance_section?.body ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      faith_finance_section: {
                        ...(prev.faith_finance_section ?? defaultHomePageContent.faith_finance_section),
                        body: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={10}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Image URL (optional)</Label>
                <Input
                  value={draft.faith_finance_section?.imageUrl ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      faith_finance_section: {
                        ...(prev.faith_finance_section ?? defaultHomePageContent.faith_finance_section),
                        imageUrl: event.target.value
                      }
                    }))
                  }
                  placeholder="https://..."
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Image Alt</Label>
                <Input
                  value={draft.faith_finance_section?.imageAlt ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      faith_finance_section: {
                        ...(prev.faith_finance_section ?? defaultHomePageContent.faith_finance_section),
                        imageAlt: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Services Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Before Highlight)</Label>
                <Input
                  value={draft.services_section?.titleBeforeHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      services_section: {
                        ...(prev.services_section ?? defaultHomePageContent.services_section),
                        titleBeforeHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Highlight)</Label>
                <Input
                  value={draft.services_section?.titleHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      services_section: {
                        ...(prev.services_section ?? defaultHomePageContent.services_section),
                        titleHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Subtitle</Label>
                <Textarea
                  value={draft.services_section?.subtitle ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      services_section: {
                        ...(prev.services_section ?? defaultHomePageContent.services_section),
                        subtitle: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={5}
                />
              </div>

              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`services-card-${index}`} className="space-y-3 rounded-lg border border-white/10 p-4 bg-black/20 inline-block w-full">
                  <div className="text-white/90 font-semibold">Service Card {index + 1}</div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Image URL (optional)</Label>
                    <Input
                      value={draft.services_section?.cards?.[index]?.imageUrl ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.services_section ?? defaultHomePageContent.services_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { imageUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, imageUrl: event.target.value };
                          return {
                            ...prev,
                            services_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      placeholder="https://..."
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Title</Label>
                    <Input
                      value={draft.services_section?.cards?.[index]?.title ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.services_section ?? defaultHomePageContent.services_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { imageUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, title: event.target.value };
                          return {
                            ...prev,
                            services_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Description</Label>
                    <Textarea
                      value={draft.services_section?.cards?.[index]?.description ?? ''}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const baseSection = prev.services_section ?? defaultHomePageContent.services_section;
                          const nextCards = Array.isArray(baseSection.cards) ? [...baseSection.cards] : [];
                          const currentCard = nextCards[index] ?? { imageUrl: '', title: '', description: '' };
                          nextCards[index] = { ...currentCard, description: event.target.value };
                          return {
                            ...prev,
                            services_section: {
                              ...baseSection,
                              cards: nextCards
                            }
                          };
                        })
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                      style={
                        {
                          '--tw-ring-offset-width': '0',
                          boxShadow: 'none',
                          outline: 'none'
                        } as CSSProperties
                      }
                      rows={5}
                    />
                  </div>
                </div>
              ))}

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">CTA Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Before Highlight)</Label>
                <Input
                  value={draft.cta_section?.titleBeforeHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        titleBeforeHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (Highlight)</Label>
                <Input
                  value={draft.cta_section?.titleHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        titleHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Title (After Highlight)</Label>
                <Input
                  value={draft.cta_section?.titleAfterHighlight ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        titleAfterHighlight: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Subtitle</Label>
                <Textarea
                  value={draft.cta_section?.subtitle ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        subtitle: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Primary Button Label</Label>
                <Input
                  value={draft.cta_section?.primaryButtonLabel ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        primaryButtonLabel: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Primary Button Link</Label>
                <Input
                  value={draft.cta_section?.primaryButtonLink ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        primaryButtonLink: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Secondary Button Label</Label>
                <Input
                  value={draft.cta_section?.secondaryButtonLabel ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        secondaryButtonLabel: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Secondary Button Link</Label>
                <Input
                  value={draft.cta_section?.secondaryButtonLink ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      cta_section: {
                        ...(prev.cta_section ?? defaultHomePageContent.cta_section),
                        secondaryButtonLink: event.target.value
                      }
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={
                    {
                      '--tw-ring-offset-width': '0',
                      boxShadow: 'none',
                      outline: 'none'
                    } as CSSProperties
                  }
                />
              </div>
            </div>

            <div className="p-6">
              <Button
                className="w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </aside>
        </>
      )}
    </section>
  );
};

export default LandingHeroNew;
