// Projects-page content. Source: resume (Feb 2026).
export interface Project {
  id: string;
  name: string;
  /** Company name for company work; undefined for personal projects. */
  org?: string;
  /** Publication year — personal projects only. */
  year?: string;
  nda: boolean;
  role: string;
  period: string;
  desc: string;
  tags: string[];
  summary: string[];
  highlights: string[];
  stack: string[];
  repo?: string;
  live?: string;
}

export const COMPANY_PROJECTS: Project[] = [
  {
    id: 'round-treasury',
    name: 'Round Treasury',
    org: 'Teamo',
    nda: false,
    role: 'Staff Engineer',
    period: '2024 — now',
    desc: 'AI-powered finance command system unifying treasury, payments, FX, and reconciliation in one intelligent platform.',
    tags: ['AWS CDK', 'OpenTelemetry', 'TypeScript'],
    summary: [
      'Round unifies treasury, payments, FX, and reconciliation for finance teams. I serve as Staff Engineer, owning infrastructure architecture and reliability.',
      'The core of my work has been paying down legacy infrastructure risk: migrating to a modular AWS CDK environment and making the platform observable enough to trust.',
    ],
    highlights: [
      'Orchestrated migration from legacy infra to modular AWS CDK, cutting cloud overhead',
      'Leading OpenTelemetry rollout — distributed tracing plus CloudWatch dashboards that cut MTTR',
      'Resolved all infrastructure findings for ISO 27001:2022 certification',
    ],
    stack: ['TypeScript', 'AWS CDK', 'OpenTelemetry', 'CloudWatch'],
  },
  {
    id: 'sohookd',
    name: 'SoHookd',
    org: 'Teamo',
    nda: false,
    role: 'Engineering Manager',
    period: 'Aug 2023 — now',
    desc: 'Wellness platform serving 40K+ monthly users, rebuilt from two legacy codebases into a unified production system on GCP.',
    tags: ['GCP', 'Node.js', 'PostgreSQL'],
    summary: [
      'A wellness platform with 40K+ MAUs that I both manage the team for and helped re-architect — consolidating two legacy codebases (NoSQL + SQL) into one unified SQL-based system on GCP.',
      'The riskiest piece was a financial data migration: $954K+ in user balances moved without losing a dollar.',
    ],
    highlights: [
      'Led full platform rebuild; consolidated two legacy codebases into one',
      'Migrated $954K+ in user balances with zero loss',
      'Took over SOC 2 audit leadership from the CTO, including external pen tests',
      '99.9% availability under full-cycle agile delivery',
      'Built an automated cross-department health dashboard for CXOs',
    ],
    stack: ['Node.js', 'PostgreSQL', 'GCP', 'Cloud Run'],
  },
  {
    id: 'zero-trust',
    name: 'Zero Trust Access Platform',
    org: 'Emumba',
    nda: true,
    role: 'Senior Software Engineer',
    period: '2021 — 2023',
    desc: 'Secure remote-access system with identity-based routing and event auditing across distributed agents. Client under NDA.',
    tags: ['Go', 'Distributed Systems'],
    summary: [
      'A zero-trust networking product: identity-based routing and full event auditing across a mesh of distributed agents, relays, and connectors.',
      'I worked on the performance-critical data plane — the parts where every percentage point of CPU matters at line rate.',
    ],
    highlights: [
      'Go agents handling 2Gbps+ of traffic; cut CPU usage from 87% to 73%',
      'Event-logging pipeline processing 100K+ daily events across the fleet',
      'Co-designed load balancing for cloud relay and connector machines',
    ],
    stack: ['Go', 'gRPC', 'Cloud Infrastructure'],
  },
  {
    id: 'analyzer',
    name: 'Analyzer',
    org: 'Automotive AI',
    nda: false,
    role: 'Technical Lead',
    period: '2018 — 2020',
    desc: '3D traffic simulation and video analytics tool for autonomous-vehicle testing and debugging.',
    tags: ['C++', 'Simulation'],
    summary: [
      'A 3D traffic simulation and video-analytics tool used to test and debug autonomous-vehicle behavior.',
      'I led the re-architecture that moved compute-intensive logic into native C++ modules, more than doubling what the tool could analyze.',
    ],
    highlights: [
      'Offloaded hot paths to C++ DLLs',
      'Raised the simulation-log ceiling from 8GB to 19GB+ — 2.4x analysis capability',
    ],
    stack: ['C++', 'Simulation', 'Video Analytics'],
  },
  {
    id: 'replicar',
    name: 'ReplicaR Scenario Portal',
    org: 'Automotive AI',
    nda: false,
    role: 'Technical Lead',
    period: '2018 — 2020',
    desc: 'Scenario-generation tool for AV simulations used by automotive clients like Audi and Continental.',
    tags: ['Architecture', 'Simulation'],
    summary: [
      'Custom scenario generation for autonomous-vehicle simulation, used directly by clients like Audi and Continental.',
      'The monolith was the bottleneck: breaking it into modules took concurrent simulations from 25 to 100+.',
    ],
    highlights: [
      'Monolith → modular architecture; 4x concurrent simulations (25 → 100+)',
      'Led the team that removed the testing bottlenecks',
    ],
    stack: ['Simulation', 'Modular Architecture'],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    org: 'AN10',
    nda: false,
    role: 'Software Engineer',
    period: '2016 — 2018',
    desc: 'BI dashboard monitoring real-time signals from 1800+ IoT devices across edge networks.',
    tags: ['Elastic Stack', 'Apache Spark', 'IoT'],
    summary: [
      'A business-intelligence dashboard ingesting real-time signals from 1800+ IoT devices across edge networks.',
      'Started as an internal hackathon project; we productized it and it was later monetized for enterprise customers.',
    ],
    highlights: [
      'Hackathon project → commercial product',
      'Real-time analytics over 1800+ edge devices',
    ],
    stack: ['Elastic Stack', 'Apache Spark', 'IoT'],
  },
];

export const PERSONAL_PROJECTS: Project[] = [
  {
    id: 'termfolio',
    name: 'termfolio',
    year: '2026',
    nda: false,
    role: 'Everything',
    period: '2026',
    desc: 'This portfolio — a flight-deck home screen with playable mini-games and an MDX-backed blog, built on Astro.',
    tags: ['Astro', 'Canvas', 'MDX'],
    summary: [
      'The site you are looking at: a canvas flight-deck home screen with playable mini-games, wrapped around a calm, readable content site.',
      'Built on Astro with an MDX blog; the games are vanilla canvas so they stay fast and dependency-free.',
    ],
    highlights: [
      'Interactive spaceship + lunar-lander games (in progress)',
      'MDX blog with tag filtering',
      'Static output on Cloudflare — zero-cost hosting',
    ],
    stack: ['Astro', 'TypeScript', 'Canvas', 'MDX'],
    repo: 'https://github.com/WaleedAli070/portfolio',
  },
];
