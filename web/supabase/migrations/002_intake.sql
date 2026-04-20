alter table public.user_profiles
  add column if not exists onboarding_intent text
  check (onboarding_intent in ('know-self', 'career', 'marriage', 'health', 'spirituality', 'full-chart'));

