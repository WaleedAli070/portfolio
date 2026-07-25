// About-page content: bio, career timeline, skills. Source: resume (Feb 2026).
export const BIO = [
  'I have spent ~10 years working my way across the stack — early-stage startups and IoT dashboards, then simulation tooling for autonomous vehicles, then distributed systems in the zero-trust networking space. The through-line has always been the same: systems that behave predictably under pressure and stay understandable to the people who run them.',
  'Today I lead engineering at Teamo — managing the team behind a wellness platform serving 40K+ monthly users, serving as Staff Engineer for a fintech treasury platform, and owning the unglamorous, load-bearing work: observability, cloud architecture, and SOC 2 / ISO 27001 compliance that lets the interesting parts ship.',
] as const;

export interface Job {
  role: string;
  org: string;
  when: string;
  dot: string;
  detail: string;
}

export const EXPERIENCE: Job[] = [
  {
    role: 'Engineering Manager',
    org: 'Teamo',
    when: 'Aug 2023 — now',
    dot: 'var(--green)',
    detail:
      'Managing 8+ engineers on the SoHookd platform (40K+ MAUs) while serving as Staff Engineer for Round Treasury. Directing SOC 2 Type II and ISO 27001 audits, automating board-level KPI scorecards, and building the performance frameworks the company now runs on.',
  },
  {
    role: 'Senior Software Engineer',
    org: 'Emumba',
    when: '2021 — 2023',
    dot: 'var(--cyan)',
    detail:
      'Distributed systems in the zero-trust networking space: Go agents pushing 2Gbps+, event pipelines handling 100K+ daily events. Led cross-org initiatives on architecture, engineering practices, and hiring.',
  },
  {
    role: 'Technical Lead',
    org: 'Automotive AI',
    when: '2018 — 2020',
    dot: 'var(--amber)',
    detail:
      'Promoted from engineer to lead within the first year. Led 5–7 engineers building simulation tools used by major automotive clients (Audi, Continental), and drove the refactors that turned internal tooling into products.',
  },
  {
    role: 'Software Engineer',
    org: 'AN10 · Heurixtics · HireNinja',
    when: '2016 — 2018',
    dot: 'var(--violet)',
    detail:
      'Where it started: building products from scratch on tight schedules, including Constellation — an IoT BI dashboard ingesting real-time signals from 1800+ devices, commercialized after a hackathon.',
  },
];

export const SKILLS = [
  'System Design',
  'Distributed Systems',
  'TypeScript',
  'Go',
  'Python',
  'Node.js',
  'React',
  'Nest.js',
  'Temporal',
  'PostgreSQL',
  'AWS',
  'GCP',
  'Kubernetes',
  'OpenTelemetry',
  'CI/CD',
  'SOC 2 / ISO 27001',
  'DORA Metrics',
  'Team Leadership',
] as const;
