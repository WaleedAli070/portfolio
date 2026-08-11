// Single source of truth for site-wide metadata.
export const SITE = {
  name: "Waleed Ali",
  title: "Waleed Ali — Engineering Manager · Systems Architect",
  roles: "Engineering Manager · Systems Architect",
  description:
    "Engineering Manager and Systems Architect — distributed systems, cloud infrastructure, observability, and teams that ship calm, reliable platforms.",
  email: "waleedali070@gmail.com",
  github: "https://github.com/WaleedAli070",
  githubLabel: "github.com/WaleedAli070",
  linkedin: "https://linkedin.com/in/syed-waleed-ali",
  linkedinLabel: "in/syed-waleed-ali",
  location: "Remote · UTC+5",
  version: "v2.0",
} as const;

// Schema.org Person, rendered via <JsonLd> on / and /about and embedded
// as the author of each BlogPosting.
export const PERSON_LD = {
  "@type": "Person",
  name: SITE.name,
  jobTitle: SITE.roles,
  url: "https://waleedali.dev",
  sameAs: [SITE.github, SITE.linkedin],
} as const;
