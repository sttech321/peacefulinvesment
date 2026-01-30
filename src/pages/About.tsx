import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import defaultAboutContent from "@/config/aboutContent.json";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Target, 
  Shield, 
  TrendingUp, 
  Award, 
  Globe, 
  Heart, 
  Zap,
  CheckCircle,
  Building2,
  Lightbulb,
  ArrowRight,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer"; 
import { Close } from "@radix-ui/react-toast";
import { Cancel } from "@radix-ui/react-alert-dialog";

type ValuesItem = {
  title?: string;
  description?: string;
};

type AchievementItem = {
  number?: string;
  label?: string;
};

type LeadershipMember = {
  name?: string;
  role?: string;
  description?: string;
};

type JourneyMilestone = {
  year?: string;
  title?: string;
  description?: string;
};

const cloneRecord = <T extends Record<string, unknown>>(value: T | undefined): T => {
  if (value && typeof value === "object") {
    return { ...value } as T;
  }
  return {} as T;
};

const mergeArrayWithDefaults = <T extends Record<string, unknown>>(
  fallback: T[] | undefined,
  overrides: T[] | null | undefined
): T[] => {
  const base = Array.isArray(fallback) ? fallback : [];

  if (!Array.isArray(overrides) || overrides.length === 0) {
    return base.map((item) => cloneRecord(item));
  }

  const normalized = overrides.map((item, index) => ({
    ...cloneRecord(index < base.length ? base[index] : undefined),
    ...cloneRecord(item)
  }));

  if (normalized.length < base.length) {
    const remaining = base.slice(normalized.length).map((item) => cloneRecord(item));
    normalized.push(...remaining);
  }

  const targetLength = base.length > 0 ? base.length : normalized.length;
  return normalized.slice(0, targetLength) as T[];
};


export default function About() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aboutContent, setAboutContent] = useState(() => ({
    ...defaultAboutContent
  }));
  const [isContentReady, setIsContentReady] = useState(false);

  const handleWhyChooseFeaturesChange = (value: string) => {
    const normalized = value.split("\n");
    setAboutContent((prev) => ({
      ...prev,
      whyChooseFeatures: normalized
    }));
  };

  const updateValuesItem = (index: number, patch: { title?: string; description?: string }) => {
    setAboutContent((prev) => {
      const currentItems = prev.valuesItems ?? defaultAboutContent.valuesItems ?? [];
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      return {
        ...prev,
        valuesItems: nextItems
      };
    });
  };

  const updateAchievementsItem = (index: number, patch: { number?: string; label?: string }) => {
    setAboutContent((prev) => {
      const currentItems = prev.achievementsItems ?? defaultAboutContent.achievementsItems ?? [];
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      return {
        ...prev,
        achievementsItems: nextItems
      };
    });
  };

  const updateLeadershipMember = (
    index: number,
    patch: { name?: string; role?: string; description?: string }
  ) => {
    setAboutContent((prev) => {
      const currentItems = prev.leadershipMembers ?? defaultAboutContent.leadershipMembers ?? [];
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      return {
        ...prev,
        leadershipMembers: nextItems
      };
    });
  };

  const updateJourneyMilestone = (
    index: number,
    patch: { year?: string; title?: string; description?: string }
  ) => {
    setAboutContent((prev) => {
      const currentItems = prev.journeyMilestones ?? defaultAboutContent.journeyMilestones ?? [];
      const nextItems = currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      return {
        ...prev,
        journeyMilestones: nextItems
      };
    });
  };

  useEffect(() => {
    const loadContent = async () => {
      let nextContent = { ...defaultAboutContent };

      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "about_content")
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = JSON.parse(data.value) as Record<string, unknown>;
          const parsedValues = parsed["valuesItems"] as ValuesItem[] | undefined;
          const parsedAchievements = parsed["achievementsItems"] as AchievementItem[] | undefined;
          const parsedLeadership = parsed["leadershipMembers"] as LeadershipMember[] | undefined;
          const parsedMilestones = parsed["journeyMilestones"] as JourneyMilestone[] | undefined;

          nextContent = {
            ...defaultAboutContent,
            ...parsed,
            valuesItems: mergeArrayWithDefaults<ValuesItem>(
              defaultAboutContent.valuesItems as ValuesItem[] | undefined,
              parsedValues ?? null
            ),
            achievementsItems: mergeArrayWithDefaults<AchievementItem>(
              defaultAboutContent.achievementsItems as AchievementItem[] | undefined,
              parsedAchievements ?? null
            ),
            leadershipMembers: mergeArrayWithDefaults<LeadershipMember>(
              defaultAboutContent.leadershipMembers as LeadershipMember[] | undefined,
              parsedLeadership ?? null
            ),
            journeyMilestones: mergeArrayWithDefaults<JourneyMilestone>(
              defaultAboutContent.journeyMilestones as JourneyMilestone[] | undefined,
              parsedMilestones ?? null
            )
          };
        }
      } catch {
        // Keep defaults when Supabase or parsing fails
      }

      setAboutContent(nextContent);
      setIsContentReady(true);
    };

    void loadContent();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { page?: string } | undefined;
      if (detail?.page !== 'about') return;
      if (!user || roleLoading || !isAdmin()) return;
      setIsEditorOpen(true);
    };

    window.addEventListener('openPageEditor', handler as EventListener);
    return () => window.removeEventListener('openPageEditor', handler as EventListener);
  }, [isAdmin, roleLoading, user]);

  const handleSave = async () => {
    if (!user || roleLoading || !isAdmin()) {
      return;
    }
    setIsSaving(true);
    const payload = JSON.stringify(aboutContent);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "about_content",
          value: payload,
          description: "About page content JSON"
        },
        { onConflict: "key" }
      );

    setIsSaving(false);
    if (!error) {
      setIsEditorOpen(false);
    }
  };

  if (!isContentReady) {
    return <div className="min-h-screen pink-yellow-shadow pt-16" />;
  }

  const mergedValuesItems = mergeArrayWithDefaults<ValuesItem>(
    defaultAboutContent.valuesItems as ValuesItem[] | undefined,
    (aboutContent.valuesItems as ValuesItem[] | undefined) ?? null
  );

  const mergedAchievementsItems = mergeArrayWithDefaults<AchievementItem>(
    defaultAboutContent.achievementsItems as AchievementItem[] | undefined,
    (aboutContent.achievementsItems as AchievementItem[] | undefined) ?? null
  );

  const mergedLeadershipMembers = mergeArrayWithDefaults<LeadershipMember>(
    defaultAboutContent.leadershipMembers as LeadershipMember[] | undefined,
    (aboutContent.leadershipMembers as LeadershipMember[] | undefined) ?? null
  );

  const mergedJourneyMilestones = mergeArrayWithDefaults<JourneyMilestone>(
    defaultAboutContent.journeyMilestones as JourneyMilestone[] | undefined,
    (aboutContent.journeyMilestones as JourneyMilestone[] | undefined) ?? null
  );

  const valueIcons = [Shield, Heart, Zap, Globe];
  const values = mergedValuesItems.map(
    (item, index) => ({
      icon: valueIcons[index] ?? Shield,
      title: item?.title ?? "",
      description: item?.description ?? ""
    })
  );

  const achievementIcons = [Users, TrendingUp, Globe, CheckCircle];
  const achievements = mergedAchievementsItems.map(
    (item, index) => ({
      number: item?.number ?? "",
      label: item?.label ?? "",
      icon: achievementIcons[index] ?? Users
    })
  );

  const team = mergedLeadershipMembers.map(
    (member) => ({
      name: member?.name ?? "",
      role: member?.role ?? "",
      description: member?.description ?? ""
    })
  );

  const milestones = mergedJourneyMilestones.map(
    (item) => ({
      year: item?.year ?? "",
      title: item?.title ?? "",
      description: item?.description ?? ""
    })
  );

  const ctaTitle = aboutContent.ctaTitle ?? defaultAboutContent.ctaTitle ?? "";
  const ctaHighlight = aboutContent.ctaHighlight ?? defaultAboutContent.ctaHighlight ?? "";
  const ctaSubtitle = aboutContent.ctaSubtitle ?? defaultAboutContent.ctaSubtitle ?? "";
  const ctaPrimaryLabel = aboutContent.ctaPrimaryLabel ?? defaultAboutContent.ctaPrimaryLabel ?? "";
  const ctaPrimaryLink = aboutContent.ctaPrimaryLink ?? defaultAboutContent.ctaPrimaryLink ?? "/auth?mode=signup";
  const ctaSecondaryLabel = aboutContent.ctaSecondaryLabel ?? defaultAboutContent.ctaSecondaryLabel ?? "";
  const ctaSecondaryLink = aboutContent.ctaSecondaryLink ?? defaultAboutContent.ctaSecondaryLink ?? "/downloads";

  return (
    <div className="min-h-screen pink-yellow-shadow pt-16">
      {/* Hero Section */}
      <section className="relative px-6 py-10 md:py-12 lg:py-24 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-0">
            <Badge variant="secondary" className="mb-6">
              <Building2 className="w-4 h-4 mr-2" />
              {aboutContent.heroBadge}
            </Badge>
            <h1 className="font-inter font-bold text-white text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-6">
              {aboutContent.heroTitle}
              <span className="text-[var(--yellowcolor)]"> {aboutContent.heroHighlight}</span>
            </h1>
            <p className="max-w-3xl mx-auto font-inter text-lg md:text-[20px] font-normal text-white mb-8">
              {aboutContent.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user && (
              <Link to={aboutContent.heroCtaPrimaryLink} className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                <Button className="hover:bg-gradient-pink-to-yellow flex  rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-xs font-semibold uppercase text-white hover:text-white w-full">
                   {aboutContent.heroCtaPrimaryLabel}
                  <ArrowRight className="w-5 h-5 ml-0 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              )}

              <Link to={aboutContent.heroCtaSecondaryLink} className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px]">
                <Button variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 p-0 px-5 font-inter text-xs font-semibold uppercase text-white w-full">
                  {aboutContent.heroCtaSecondaryLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="mb-4 md:mb-6 font-inter text-2xl font-bold text-white md:text-3xl">
                {aboutContent.missionVisionTitle}
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {aboutContent.missionTitle}
                    </h3>
                    <p className="font-open-sans text-lg text-muted-foreground">
                      {aboutContent.missionBody}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {aboutContent.visionTitle}
                    </h3>
                    <p className="font-open-sans text-lg text-muted-foreground">
                      {aboutContent.visionBody}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl transform rotate-3"></div>
              <Card className="relative bg-white/50 border-0 shadow-xl">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    {aboutContent.whyChooseTitle}
                  </h3>
                  <div className="space-y-4">
                    {(aboutContent.whyChooseFeatures ?? [])
                      .filter((feature) => feature.trim().length > 0)
                      .map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-black flex-shrink-0" />
                        <span className="text-black">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="mb-4 md:mb-6 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              {aboutContent.valuesTitle}{" "}
              <span className="text-[var(--yellowcolor)]">{aboutContent.valuesHighlight}</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              {aboutContent.valuesSubtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="mb-5 md:mb-0 last:mb-0 relative group rounded-xl bg-black/10 backdrop-blur-sm border border-[var(--yellowcolor)] px-6 pt-10 pb-8 text-center shadow-sm transition duration-300 hover:border-[var(--yellowcolor)] hover:shadow-lg hover:shadow-[var(--yellowcolor)]/10"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Step Badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--yellowcolor)] text-black shadow-md ring-1 ring-black/10 transition group-hover:scale-105">
                    <value.icon className="h-8 w-8" />
                  </div>
                </div>
                 
                <h3 className="mt-5 text-lg font-semibold text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-open-sans">
                  {value.description}
                </p>
                {/* Progress Bar line under card for step flow */}
                {index < values.length - 0 && (
                  <div className="absolute bottom-0 left-1/2 hidden h-10 w-px translate-x-[-50%] translate-y-full bg-gradient-to-b from-[var(--yellowcolor)] to-transparent lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              {aboutContent.achievementsTitle}{" "}
              <span className="text-[var(--yellowcolor)]">{aboutContent.achievementsHighlight}</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              {aboutContent.achievementsSubtitle}
            </p>
          </div>
 


          <div className='bg-gradient-pink-to-yellow rounded-sm p-[2px]'>
            <div className='grid grid-cols-2 gap-0 rounded-sm bg-black md:grid-cols-4 pt-5 pb-4 items-center'>
            {achievements.map((achievement, index) => (
              <div key={index} className="glass-card border-0 bg-transparent p-4 text-center shadow-none">
                <div className="w-20 h-20 mx-auto mb-7 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <achievement.icon className="w-10 h-10 text-primary" />
                </div>
                <div className="mb-2 font-bebas-neue text-[45px] xl:text-[50px] font-normal leading-[36px] text-white">
                  {achievement.number}
                </div>
                <div className="font-open-sans text-[18px] lg:text-xl font-normal text-white pt-2">
                  {achievement.label}
                </div>
              </div>
            ))}
          </div>
          </div>


        </div>
      </section>

      {/* Team */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              {aboutContent.leadershipTitle}{" "}
              <span className="text-[var(--yellowcolor)]">{aboutContent.leadershipHighlight}</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              {aboutContent.leadershipSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div 
                key={index} 
                className="hover:glow-primary bg-gradient-pink-to-yellow group relative overflow-hidden rounded-lg p-[2px] text-center h-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="rounded-lg bg-black p-8 h-full">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-12 h-12 text-primary" />
                  </div>
                </div>
                <h3 className="font-bebas-neue text-2xl font-normal text-white mb-1">
                  {member.name}
                </h3>
                <p className="text-primary font-medium mb-3">
                  {member.role}
                </p>
                <p className="font-open-sans text-sm leading-relaxed text-white">
                  {member.description}
                </p>
</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Timeline */}
      <section className="px-6 pt-10 md:pt-12 lg:pt-24 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-16">
            <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
              {aboutContent.journeyTitle}{" "}
              <span className="text-[var(--yellowcolor)]">{aboutContent.journeyHighlight}</span>
            </h2>
            <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
              {aboutContent.journeySubtitle}
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-gradient-primary"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => {
                const isLeft = index % 2 === 0;
                return (
                  <div
                    key={index}
                    className={`flex items-center ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Card Side */}
                    <div className={`md:w-1/2 ${isLeft ? 'pr-4 md:pr-8' : 'pl-4 md:pl-8'}`}>
                      <Card className="glass-card bg-black border-1 shadow-lg relative">
                        <CardContent className="p-0">
                          <div className="flex items-center mb-3">
                            <Badge variant="secondary" className="mr-3 bg-primary hover:bg-primary border-0">
                              {milestone.year}
                            </Badge>
                            <Award className="w-5 h-5 text-primary" />
                          </div>
                          <h3 className="text-xl font-inter font-semibold text-white mb-2">
                            {milestone.title}
                          </h3>
                          <p className="text-muted-foreground font-open-sans leading-relaxed">
                            {milestone.description}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    {/* Horizontal connector line (attach to card edge) */}
                    <div
                      className={`hidden md:inline-block h-0.5 w-12 bg-primary ${isLeft ? '-ml-[47px]' : '-mr-[47px]'}`}
                      aria-hidden="true"
                    ></div>
                    {/* Timeline Dot */}
                    <div className="hidden md:inline-block w-4 h-4 bg-gradient-primary rounded-full border-4 border-primary shadow-lg"></div>
                    {/* Spacer Side */}
                    <div className="hidden md:inline-block w-1/2 px-8"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-10 md:py-12 lg:py-24 bg-transparent">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="mb-4 md:mb-5 font-inter text-2xl font-bold uppercase text-white md:text-3xl">
            {ctaTitle} <span className="text-[var(--yellowcolor)]">{ctaHighlight}</span>
          </h2>
          <p className="mx-auto max-w-3xl font-open-sans text-lg text-white lg:text-xl">
            {ctaSubtitle}
          </p>
          <div className="flex sm:flex-row gap-4 justify-center pt-8 md:pt-10 max-w-sm mx-auto">
             {!user && (
            <Link to={ctaPrimaryLink} className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] w-full">
              <Button size="lg" variant="secondary" className="hover:bg-gradient-pink-to-yellow flex rounded-[10px] border-0 bg-black p-0 px-5 font-inter text-sm font-semibold uppercase text-white hover:text-white w-full">
                {ctaPrimaryLabel}
              </Button>
            </Link>
             )}
             
            <Link to={ctaSecondaryLink} className="bg-gradient-pink-to-yellow rounded-[12px] p-[2px] w-full">
              <Button size="lg" variant="outline" className="bg-gradient-yellow-to-pink hover:bg-gradient-pink-to-yellow block rounded-[10px] border-0 p-0 px-5 font-inter text-sm font-semibold uppercase text-white w-full">
                {ctaSecondaryLabel}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {user && !roleLoading && isAdmin() && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/70 transition-opacity ${
              isEditorOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-[#2e2e2e] text-black shadow-2xl transition-transform duration-300 ${
              isEditorOpen ? "translate-x-0" : "translate-x-full"
            }`}
            aria-label="Edit About Page"
          >
            <div className="flex items-center justify-between border-0 border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Edit About Page</h2>
              <Button size="sm" variant="outline" className="text-black border-0 rounded-[8px] bg-white/10 hover:bg-white/20" onClick={() => setIsEditorOpen(false)}>
                 
                <X className="h-4 w-4 text-white" />

              </Button>
            </div>
            <div
              className="space-y-4 px-6 pt-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
              style={{ height: "calc(100vh - 157px)" }}
            >
              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[0px!important]">
                <h3 className="text-white font-semibold">Hero Section</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Badge</Label>
                <Input
                  value={aboutContent.heroBadge}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroBadge: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-0 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Title</Label>
                <Input
                  value={aboutContent.heroTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Highlight</Label>
                <Input
                  value={aboutContent.heroHighlight}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Subtitle</Label>
                <Textarea
                  value={aboutContent.heroSubtitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={4}
                />
              </div> 
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Primary Button Label</Label>
                <Input
                  value={aboutContent.heroCtaPrimaryLabel}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroCtaPrimaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Primary Button Link</Label>
                <Input
                  value={aboutContent.heroCtaPrimaryLink}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroCtaPrimaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Secondary Button Label</Label>
                <Input
                  value={aboutContent.heroCtaSecondaryLabel}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroCtaSecondaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Secondary Button Link</Label>
                <Input
                  value={aboutContent.heroCtaSecondaryLink}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      heroCtaSecondaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Mission & Vision Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Mission & Vision Title</Label>
                <Input
                  value={aboutContent.missionVisionTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      missionVisionTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Mission Title</Label>
                <Input
                  value={aboutContent.missionTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      missionTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Mission Text</Label>
                <Textarea
                  value={aboutContent.missionBody}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      missionBody: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={4}
                />
              </div>

              
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Vision Title</Label>
                <Input
                  value={aboutContent.visionTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      visionTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Vision Text</Label>
                <Textarea
                  value={aboutContent.visionBody}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      visionBody: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={4}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Why Choose Title</Label>
                <Input
                  value={aboutContent.whyChooseTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      whyChooseTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Why Choose Features (one per line)</Label>
                <Textarea
                  value={(aboutContent.whyChooseFeatures ?? []).join("\n")}
                  onChange={(event) => handleWhyChooseFeaturesChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Tab") {
                      return;
                    }
                    event.preventDefault();
                    const target = event.currentTarget;
                    const { selectionStart, selectionEnd, value } = target;
                    const nextValue = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
                    handleWhyChooseFeaturesChange(nextValue);
                    requestAnimationFrame(() => {
                      target.selectionStart = selectionStart + 1;
                      target.selectionEnd = selectionStart + 1;
                    });
                  }}
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={6}
                />
              </div>


              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Values Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Values Title</Label>
                <Input
                  value={aboutContent.valuesTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      valuesTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Values Highlight</Label>
                <Input
                  value={aboutContent.valuesHighlight}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      valuesHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Values Subtitle</Label>
                <Textarea
                  value={aboutContent.valuesSubtitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      valuesSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm text-white font-normal">Values Items</Label>
                {(aboutContent.valuesItems ?? defaultAboutContent.valuesItems ?? []).map((item, index) => (
                  <div key={`values-item-${index}`} className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full">
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Title</Label>
                      <Input
                        value={item?.title ?? ""}
                        onChange={(event) =>
                          updateValuesItem(index, { title: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Description</Label>
                      <Textarea
                        value={item?.description ?? ""}
                        onChange={(event) =>
                          updateValuesItem(index, { description: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Achievements Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Achievements Title</Label>
                <Input
                  value={aboutContent.achievementsTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      achievementsTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Achievements Highlight</Label>
                <Input
                  value={aboutContent.achievementsHighlight}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      achievementsHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Achievements Subtitle</Label>
                <Textarea
                  value={aboutContent.achievementsSubtitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      achievementsSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm text-white font-normal">Achievements Items</Label>
                {(aboutContent.achievementsItems ?? defaultAboutContent.achievementsItems ?? []).map((item, index) => (
                  <div key={`achievements-item-${index}`} className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full">
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Number</Label>
                      <Input
                        value={item?.number ?? ""}
                        onChange={(event) =>
                          updateAchievementsItem(index, { number: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Label</Label>
                      <Input
                        value={item?.label ?? ""}
                        onChange={(event) =>
                          updateAchievementsItem(index, { label: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Leadership Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Leadership Title</Label>
                <Input
                  value={aboutContent.leadershipTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      leadershipTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Leadership Highlight</Label>
                <Input
                  value={aboutContent.leadershipHighlight}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      leadershipHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Leadership Subtitle</Label>
                <Textarea
                  value={aboutContent.leadershipSubtitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      leadershipSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm text-white font-normal">Leadership Members</Label>
                {(aboutContent.leadershipMembers ?? defaultAboutContent.leadershipMembers ?? []).map((member, index) => (
                  <div key={`leadership-member-${index}`} className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full">
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Name</Label>
                      <Input
                        value={member?.name ?? ""}
                        onChange={(event) =>
                          updateLeadershipMember(index, { name: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Role</Label>
                      <Input
                        value={member?.role ?? ""}
                        onChange={(event) =>
                          updateLeadershipMember(index, { role: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Description</Label>
                      <Textarea
                        value={member?.description ?? ""}
                        onChange={(event) =>
                          updateLeadershipMember(index, { description: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">Journey Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Journey Title</Label>
                <Input
                  value={aboutContent.journeyTitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      journeyTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Journey Highlight</Label>
                <Input
                  value={aboutContent.journeyHighlight}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      journeyHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Journey Subtitle</Label>
                <Textarea
                  value={aboutContent.journeySubtitle}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      journeySubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm text-white font-normal">Journey Milestones</Label>
                {(aboutContent.journeyMilestones ?? defaultAboutContent.journeyMilestones ?? []).map((item, index) => (
                  <div key={`journey-milestone-${index}`} className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full">
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Year</Label>
                      <Input
                        value={item?.year ?? ""}
                        onChange={(event) =>
                          updateJourneyMilestone(index, { year: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Title</Label>
                      <Input
                        value={item?.title ?? ""}
                        onChange={(event) =>
                          updateJourneyMilestone(index, { title: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-white font-normal">Description</Label>
                      <Textarea
                        value={item?.description ?? ""}
                        onChange={(event) =>
                          updateJourneyMilestone(index, { description: event.target.value })
                        }
                        className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-black border-l-4 border-primary mx-[-24px] px-6 py-4 mt-[25px!important]">
                <h3 className="text-white font-semibold">CTA Section</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Title</Label>
                <Input
                  value={aboutContent.ctaTitle ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaTitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Highlight</Label>
                <Input
                  value={aboutContent.ctaHighlight ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaHighlight: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Subtitle</Label>
                <Textarea
                  value={aboutContent.ctaSubtitle ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaSubtitle: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Primary Button Label</Label>
                <Input
                  value={aboutContent.ctaPrimaryLabel ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaPrimaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Primary Button Link</Label>
                <Input
                  value={aboutContent.ctaPrimaryLink ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaPrimaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Secondary Button Label</Label>
                <Input
                  value={aboutContent.ctaSecondaryLabel ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaSecondaryLabel: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">CTA Secondary Button Link</Label>
                <Input
                  value={aboutContent.ctaSecondaryLink ?? ""}
                  onChange={(event) =>
                    setAboutContent((prev) => ({
                      ...prev,
                      ctaSecondaryLink: event.target.value
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
            </div>
            <div className="p-6">
              <Button
                className="w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
