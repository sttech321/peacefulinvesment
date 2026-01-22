export const APP_TEXT_DEFINITIONS: Record<
  string,
  {
    label: string;
    default: string;
  }
> = {
  // Stats
  stats_aum_value: {
    label: "AUM Value",
    default: "35+",
  },
  stats_aum_label: {
    label: "AUM Label",
    default: "Assets Under Management",
  },

  stats_investors_value: {
    label: "Investors Count",
    default: "$100K+",
  },
  stats_investors_label: {
    label: "Investors Label",
    default: "Active Investors",
  },

  stats_uptime_value: {
    label: "Uptime Value",
    default: "99.9%",
  },
  stats_uptime_label: {
    label: "Uptime Label",
    default: "Platform Uptime",
  },

  stats_support_value: {
    label: "Support Availability",
    default: "24/7",
  },
  stats_support_label: {
    label: "Support Label",
    default: "Expert Support",
  },

  // Community
  community_title: {
    label: "Community Title",
    default: "JOIN OUR COMMUNITY",
  },
  community_description: {
    label: "Community Description",
    default:
      "Connect with successful investors and learn from the best.",
  },

  // Referral page
  referral_page_title: {
    label: "Referral Page Title",
    default: "Referrals Dashboard",
  },
  referral_page_subtitle: {
    label: "Referral Page Subtitle",
    default:
      "Earn 5% commission on every successful referral",
  },

  // Referral helpers
  referral_share_helper_text: {
    label: "Referral Share Helper Text",
    default:
      "Share this link with friends to earn 5% commission on their trading account.",
  },

  referral_earn_helper_text: {
    label: "Referral Earn Helper Text",
    default:
      "Get 5% commission when they make their first deposit",
  },

  // Referral steps
  referral_step_1_title: {
    label: "Step 1 Title",
    default: "Share Your Link",
  },
  referral_step_1_text: {
    label: "Step 1 Description",
    default:
      "Share your unique referral link with friends and family",
  },

  referral_step_2_title: {
    label: "Step 2 Title",
    default: "They Sign Up",
  },
  referral_step_2_text: {
    label: "Step 2 Description",
    default:
      "New users create an account using your referral link",
  },

  referral_step_3_title: {
    label: "Step 3 Title",
    default: "Earn 5%",
  },
  referral_step_3_text: {
    label: "Step 3 Description",
    default:
      "Get 5% commission when they make their first deposit",
  },
};

export const DEFAULT_APP_TEXTS: Record<string, string> = Object.fromEntries(
  Object.entries(APP_TEXT_DEFINITIONS).map(([key, v]) => [
    key,
    v.default,
  ])
);

export const APP_TEXT_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(APP_TEXT_DEFINITIONS).map(([key, v]) => [
    key,
    v.label,
  ])
);

export const APP_TEXT_PLACEHOLDERS = DEFAULT_APP_TEXTS;