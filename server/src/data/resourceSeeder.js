import { repository } from './repository.js';

export const canonicalResources = [
  {
    id: 'res-react-1',
    domain: 'dom-frontend',
    skill_tags: JSON.stringify(['React', 'JavaScript', 'Frontend']),
    title: 'React Official Documentation & Interactive Tutorials',
    provider: 'React Core Team',
    type: 'documentation',
    url: 'https://react.dev/learn',
    is_free: 1,
    level: 'Beginner',
    duration: '15 hours',
    language: 'English',
  },
  {
    id: 'res-ts-1',
    domain: 'dom-frontend',
    skill_tags: JSON.stringify(['TypeScript', 'JavaScript']),
    title: 'TypeScript for JavaScript Programmers Handbook',
    provider: 'Microsoft',
    type: 'handbook',
    url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html',
    is_free: 1,
    level: 'Intermediate',
    duration: '8 hours',
    language: 'English',
  },
  {
    id: 'res-node-1',
    domain: 'dom-backend',
    skill_tags: JSON.stringify(['Node.js', 'Express', 'Backend']),
    title: 'Node.js Developer Guides & Architecture Patterns',
    provider: 'OpenJS Foundation',
    type: 'guide',
    url: 'https://nodejs.org/en/learn',
    is_free: 1,
    level: 'Beginner',
    duration: '12 hours',
    language: 'English',
  },
  {
    id: 'res-sql-1',
    domain: 'dom-backend',
    skill_tags: JSON.stringify(['SQL', 'PostgreSQL', 'Database']),
    title: 'PostgreSQL Tutorial & Query Optimization Mastery',
    provider: 'Postgres Guide',
    type: 'interactive',
    url: 'https://www.postgresqltutorial.com/',
    is_free: 1,
    level: 'Beginner',
    duration: '10 hours',
    language: 'English',
  },
  {
    id: 'res-ml-1',
    domain: 'dom-aiml',
    skill_tags: JSON.stringify(['Python', 'Machine Learning', 'Data Science']),
    title: 'Practical Deep Learning for Coders',
    provider: 'fast.ai',
    type: 'course',
    url: 'https://course.fast.ai/',
    is_free: 1,
    level: 'Intermediate',
    duration: '25 hours',
    language: 'English',
  },
  {
    id: 'res-sec-1',
    domain: 'dom-cybersecurity',
    skill_tags: JSON.stringify(['Security', 'Networking', 'Ethical Hacking']),
    title: 'OWASP Top 10 Web Application Security Vulnerabilities',
    provider: 'OWASP Foundation',
    type: 'standard',
    url: 'https://owasp.org/www-project-top-ten/',
    is_free: 1,
    level: 'Beginner',
    duration: '6 hours',
    language: 'English',
  },
  {
    id: 'res-devops-1',
    domain: 'dom-clouddevops',
    skill_tags: JSON.stringify(['Docker', 'Kubernetes', 'DevOps']),
    title: 'Docker Hands-on Curriculum for Developers',
    provider: 'Docker Docs',
    type: 'hands-on',
    url: 'https://docs.docker.com/get-started/',
    is_free: 1,
    level: 'Beginner',
    duration: '8 hours',
    language: 'English',
  },
  {
    id: 'res-system-design-1',
    domain: 'dom-backend',
    skill_tags: JSON.stringify(['System Design', 'Architecture', 'Microservices']),
    title: 'System Design Primer & Scalability Patterns',
    provider: 'Donne Martin (Open Source)',
    type: 'handbook',
    url: 'https://github.com/donnemartin/system-design-primer',
    is_free: 1,
    level: 'Advanced',
    duration: '30 hours',
    language: 'English',
  },
];

export function seedLearningResources() {
  const countRow = repository.queryOne('SELECT COUNT(*) as count FROM learning_resources;');
  if (countRow?.count > 0) {
    return { seeded: false, count: countRow.count };
  }

  const now = new Date().toISOString();
  repository.transaction((repo) => {
    for (const r of canonicalResources) {
      repo.execute(
        `INSERT INTO learning_resources (
          id, domain, skill_tags, title, provider, type, url, is_free, level, duration, language, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [r.id, r.domain, r.skill_tags, r.title, r.provider, r.type, r.url, r.is_free, r.level, r.duration, r.language, now]
      );
    }
  });

  return { seeded: true, count: canonicalResources.length };
}
