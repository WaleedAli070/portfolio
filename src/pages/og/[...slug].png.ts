// Build-time social share cards (1200×627, LinkedIn's 1.91:1) — one per
// top-level page and per blog post, referenced by the og:image tags in
// Base.astro. Rendered with satori + resvg at build only; nothing here
// ships to the client or the worker. Card chrome mirrors the terminal
// titlebar in Site.astro.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { SITE } from '../../data/site';

interface CardProps {
  /** Terminal path shown in the card titlebar, e.g. "~/blog/slug". */
  path: string;
  title: string;
  body: string;
  /** Small green line above the title (home card only). */
  kicker?: string;
  tags?: string[];
  date?: string;
}

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  // Kickers reuse each page's terminal command line.
  const pages: Record<string, CardProps> = {
    index: {
      path: '~/',
      title: SITE.name,
      kicker: 'ssh pilot@waleedali.dev',
      body: SITE.description,
    },
    about: { path: '~/about', title: 'About', kicker: 'whoami', body: SITE.description },
    projects: {
      path: '~/projects',
      title: 'Selected work',
      kicker: 'ls -la projects/',
      body: 'Company and personal projects — distributed systems, cloud infrastructure, observability, and a portfolio that is secretly a game.',
    },
    blog: {
      path: '~/blog',
      title: 'Writing',
      kicker: 'cat blog/*.md',
      body: 'Notes on distributed systems, infrastructure, and leading engineering teams.',
    },
    contact: {
      path: '~/contact',
      title: 'Contact',
      kicker: './contact --send',
      body: 'Open a channel — email, GitHub, or LinkedIn.',
    },
  };

  return [
    ...Object.entries(pages).map(([slug, props]) => ({ params: { slug }, props })),
    ...posts.map((post) => ({
      params: { slug: `blog/${post.id}` },
      props: {
        path: `~/blog/${post.id}`,
        title: post.data.title,
        body: post.data.excerpt,
        tags: post.data.tags,
        date: post.data.date.toISOString().slice(0, 10),
      } satisfies CardProps,
    })),
  ];
}

const font = (file: string) => readFileSync(join(process.cwd(), 'src/assets/fonts', file));
const FONTS = [
  { name: 'JetBrains Mono', data: font('JetBrainsMono-Regular.ttf'), weight: 400 as const },
  { name: 'Space Grotesk', data: font('SpaceGrotesk-SemiBold.ttf'), weight: 600 as const },
];

// satori's object-form JSX.
type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const el = (style: Record<string, unknown>, children: Node[] | string): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});
const text = (style: Record<string, unknown>, content: string): Node =>
  ({ type: 'div', props: { style: { display: 'block', ...style }, children: content } });

const light = (color: string) =>
  el({ width: 15, height: 15, borderRadius: 999, background: color }, []);

const card = ({ path, title, body, kicker, tags = [], date }: CardProps) =>
  el(
    {
      width: 1200,
      height: 627,
      flexDirection: 'column',
      background: '#070b12',
      backgroundImage: 'radial-gradient(circle at 25% -10%, rgba(34, 211, 238, 0.10), transparent 55%)',
      padding: 40,
      fontFamily: 'JetBrains Mono',
    },
    [
      el(
        {
          flex: 1,
          flexDirection: 'column',
          border: '1px solid #1b2637',
          borderRadius: 18,
          background: 'rgba(10, 15, 24, 0.82)',
        },
        [
          // Titlebar: traffic lights · prompt · domain
          el(
            {
              alignItems: 'center',
              gap: 12,
              padding: '22px 34px',
              borderBottom: '1px solid #131f2e',
            },
            [
              light('#f87171'),
              light('rgba(251, 191, 36, 0.55)'),
              light('rgba(52, 211, 153, 0.55)'),
              text({ marginLeft: 14, fontSize: 22, color: '#8ca3bf' }, `pilot@portfolio: ${path}`),
              el({ flex: 1 }, []),
              text({ fontSize: 22, color: '#34d399' }, 'waleedali.dev'),
            ],
          ),
          // Body
          el({ flex: 1, flexDirection: 'column', padding: '40px 56px 36px' }, [
            ...(kicker
              ? [text({ fontSize: 24, color: '#34d399', marginBottom: 18 }, `$ ${kicker}`)]
              : []),
            text(
              {
                fontFamily: 'Space Grotesk',
                fontWeight: 600,
                fontSize: 58,
                lineHeight: 1.12,
                letterSpacing: '-1px',
                color: '#eaf2ff',
                lineClamp: 3,
              },
              title,
            ),
            text(
              {
                fontSize: 24,
                lineHeight: 1.55,
                color: '#b3c1d4',
                marginTop: 26,
                lineClamp: 3,
              },
              body,
            ),
            el({ flex: 1 }, []),
            // Footer: tag chips · date
            el({ alignItems: 'center', gap: 12 }, [
              ...tags.map((t) =>
                el(
                  {
                    padding: '7px 18px',
                    borderRadius: 8,
                    fontSize: 21,
                    color: '#67e8f9',
                    background: 'rgba(6, 182, 212, 0.10)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                  },
                  [text({}, `#${t}`)],
                ),
              ),
              el({ flex: 1 }, []),
              ...(date ? [text({ fontSize: 21, color: '#64748b' }, date)] : []),
            ]),
          ]),
        ],
      ),
    ],
  );

export const GET: APIRoute = async ({ props }) => {
  const svg = await satori(card(props as CardProps), {
    width: 1200,
    height: 627,
    fonts: FONTS,
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
