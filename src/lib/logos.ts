export interface LogoEntry {
  id: string;
  name: string;
  file: string;
  matchPatterns: string[];
}

export const LOGOS: LogoEntry[] = [
  {
    id: 'slack',
    name: 'Slack',
    file: new URL('../assets/logo/slack.svg', import.meta.url).href,
    matchPatterns: ['slack.com', 'slack'],
  },
  {
    id: 'github',
    name: 'GitHub',
    file: new URL('../assets/logo/github.svg', import.meta.url).href,
    matchPatterns: ['github.com', 'github'],
  },
  {
    id: 'google',
    name: 'Google',
    file: new URL('../assets/logo/google.svg', import.meta.url).href,
    matchPatterns: ['google.com', 'google', 'accounts.google.com'],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    file: new URL('../assets/logo/gmail.svg', import.meta.url).href,
    matchPatterns: ['gmail.com', 'gmail', 'mail.google.com'],
  },
  {
    id: 'aws',
    name: 'AWS',
    file: new URL('../assets/logo/aws.svg', import.meta.url).href,
    matchPatterns: ['aws.amazon.com', 'amazon.com', 'aws'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    file: new URL('../assets/logo/facebook.svg', import.meta.url).href,
    matchPatterns: ['facebook.com', 'facebook', 'fb.com'],
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    file: new URL('../assets/logo/bitbucket.svg', import.meta.url).href,
    matchPatterns: ['bitbucket.org', 'bitbucket'],
  },
  {
    id: 'npm',
    name: 'npm',
    file: new URL('../assets/logo/npm.svg', import.meta.url).href,
    matchPatterns: ['npmjs.com', 'npm', 'www.npmjs.com'],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    file: new URL('../assets/logo/sendgrid.svg', import.meta.url).href,
    matchPatterns: ['sendgrid.com', 'sendgrid'],
  },
];

export function getLogoById(id: string): LogoEntry | undefined {
  return LOGOS.find((l) => l.id === id);
}

export function findLogoForAccount(issuer: string, urlPatterns?: string[]): LogoEntry | undefined {
  const lowerIssuer = issuer.toLowerCase();

  for (const logo of LOGOS) {
    for (const pattern of logo.matchPatterns) {
      if (lowerIssuer.includes(pattern.toLowerCase())) {
        return logo;
      }
    }
  }

  if (urlPatterns) {
    for (const urlPattern of urlPatterns) {
      const lowerUrl = urlPattern.toLowerCase();
      for (const logo of LOGOS) {
        for (const pattern of logo.matchPatterns) {
          if (lowerUrl.includes(pattern.toLowerCase())) {
            return logo;
          }
        }
      }
    }
  }

  return undefined;
}
