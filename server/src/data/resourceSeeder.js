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
    description: 'Master modern React concepts including hooks, state management, component lifecycle, and reactive UI architecture directly from the React team.',
    learning_objectives: JSON.stringify([
      'Build reusable modular components using functional patterns',
      'Manage complex local and global state with useState, useReducer, and Context',
      'Handle side effects cleanly with useEffect and custom hooks',
      'Optimize rendering performance with memoization techniques'
    ]),
    prerequisites: JSON.stringify(['Modern JavaScript (ES6+)', 'HTML & CSS Foundations'])
  },
  {
    id: 'res-ts-1',
    domain: 'dom-frontend',
    skill_tags: JSON.stringify(['TypeScript', 'JavaScript', 'Frontend']),
    title: 'TypeScript for JavaScript Programmers Handbook',
    provider: 'Microsoft',
    type: 'handbook',
    url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html',
    is_free: 1,
    level: 'Intermediate',
    duration: '8 hours',
    language: 'English',
    description: 'Deep dive into static typing, interfaces, generics, utility types, and compiler configurations for enterprise JavaScript applications.',
    learning_objectives: JSON.stringify([
      'Construct robust type signatures with interfaces and type aliases',
      'Leverage generic types for scalable and reusable codebases',
      'Configure tsconfig.json for production bundling and strict safety',
      'Prevent runtime null and undefined bugs using strict mode'
    ]),
    prerequisites: JSON.stringify(['Intermediate JavaScript (Objects, Promises, Closures)'])
  },
  {
    id: 'res-next-1',
    domain: 'dom-frontend',
    skill_tags: JSON.stringify(['Next.js', 'React', 'Full-Stack']),
    title: 'Next.js App Router Foundations & Server Actions',
    provider: 'Vercel',
    type: 'interactive',
    url: 'https://nextjs.org/learn',
    is_free: 1,
    level: 'Intermediate',
    duration: '10 hours',
    language: 'English',
    description: 'Learn production-grade server-side rendering, streaming, Server Actions, route handlers, and SEO optimization in Next.js.',
    learning_objectives: JSON.stringify([
      'Implement React Server Components (RSC) and Client Components',
      'Build data mutation flows with Server Actions and optimistic updates',
      'Implement dynamic layouts, parallel routes, and intercepted routes'
    ]),
    prerequisites: JSON.stringify(['React Foundations', 'Async JavaScript'])
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
    description: 'Comprehensive guide to building asynchronous backend services, handling streams, HTTP servers, middleware, and Node event loop mechanics.',
    learning_objectives: JSON.stringify([
      'Understand event loop phases, worker threads, and asynchronous I/O',
      'Design RESTful web APIs using Express and middleware patterns',
      'Implement structured error handling and secure input validation'
    ]),
    prerequisites: JSON.stringify(['JavaScript ES6+', 'Basic Command Line'])
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
    description: 'Relational database fundamentals covering normalization, complex joins, subqueries, indexing, window functions, and EXPLAIN query plan analysis.',
    learning_objectives: JSON.stringify([
      'Write robust analytical queries with aggregations and window functions',
      'Design normalized database schemas with foreign key constraints',
      'Optimize query execution time through B-tree indexing strategies'
    ]),
    prerequisites: JSON.stringify(['Basic understanding of tabular data'])
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
    description: 'Learn how to design large-scale distributed systems, load balancing, caching strategies, database sharding, asynchronous message queues, and CAP theorem trade-offs.',
    learning_objectives: JSON.stringify([
      'Design high-throughput distributed systems from requirements to architecture',
      'Evaluate trade-offs between consistency, availability, and partition tolerance',
      'Apply caching layers (Redis), message queues (Kafka), and CDN architectures'
    ]),
    prerequisites: JSON.stringify(['Backend Web Development', 'Basic Networking & Databases'])
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
    description: 'Top-down hands-on introduction to training modern neural networks, transfer learning, computer vision, natural language processing, and model deployment.',
    learning_objectives: JSON.stringify([
      'Train computer vision and NLP models using PyTorch and fastai',
      'Clean, preprocess, and augment real-world training datasets',
      'Deploy trained models to web endpoints for production inference'
    ]),
    prerequisites: JSON.stringify(['Basic Python programming experience'])
  },
  {
    id: 'res-python-1',
    domain: 'dom-aiml',
    skill_tags: JSON.stringify(['Python', 'Data Structures', 'Backend']),
    title: 'Python Official Language Tutorial & Standard Library',
    provider: 'Python Software Foundation',
    type: 'documentation',
    url: 'https://docs.python.org/3/tutorial/',
    is_free: 1,
    level: 'Beginner',
    duration: '14 hours',
    language: 'English',
    description: 'Foundational language reference covering Python control flow, data structures, modules, object-oriented programming, and standard library modules.',
    learning_objectives: JSON.stringify([
      'Master core data structures (lists, tuples, dicts, sets)',
      'Write idiomatic Python using list comprehensions and generators',
      'Manage packages and virtual environments using pip and venv'
    ]),
    prerequisites: JSON.stringify(['No prior programming required'])
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
    description: 'Industry-standard handbook detailing critical web security risks, injection flaws, broken access control, cryptographic failures, and security misconfigurations.',
    learning_objectives: JSON.stringify([
      'Identify and remediate SQL injection, XSS, and CSRF vulnerabilities',
      'Implement defense-in-depth access control and token verification',
      'Secure API endpoints with rate limiting, sanitization, and HTTPS headers'
    ]),
    prerequisites: JSON.stringify(['Basic Web Architecture (HTTP, Client-Server)'])
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
    description: 'Practical guide to containerization, creating multi-stage Dockerfiles, managing container volumes, and orchestrating services with Docker Compose.',
    learning_objectives: JSON.stringify([
      'Containerize full-stack applications with optimal Dockerfiles',
      'Orchestrate multi-container environments using docker-compose',
      'Manage container networking, storage volumes, and environment variables'
    ]),
    prerequisites: JSON.stringify(['Basic Terminal & Command Line usage'])
  },
  {
    id: 'res-git-1',
    domain: 'dom-frontend',
    skill_tags: JSON.stringify(['Git', 'GitHub', 'Collaboration']),
    title: 'Git Version Control & Collaborative Workflow Guide',
    provider: 'GitHub Skills',
    type: 'interactive',
    url: 'https://skills.github.com/',
    is_free: 1,
    level: 'Beginner',
    duration: '5 hours',
    language: 'English',
    description: 'Hands-on interactive learning modules for branching strategies, pull requests, resolving merge conflicts, and GitHub Actions continuous integration.',
    learning_objectives: JSON.stringify([
      'Manage branch-based development workflows and pull requests',
      'Safely resolve merge conflicts and inspect commit history with rebase',
      'Automate testing with GitHub Actions CI workflows'
    ]),
    prerequisites: JSON.stringify(['Basic Command Line usage'])
  }
];

export function seedLearningResources() {
  const countRow = repository.queryOne('SELECT COUNT(*) as count FROM learning_resources;');
  const now = new Date().toISOString();

  repository.transaction((repo) => {
    for (const r of canonicalResources) {
      const existing = repo.queryOne('SELECT id, description FROM learning_resources WHERE id = ?;', [r.id]);
      if (!existing) {
        repo.execute(
          `INSERT INTO learning_resources (
            id, domain, skill_tags, title, provider, type, url, is_free, level, duration, language, description, learning_objectives, prerequisites, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.domain,
            r.skill_tags,
            r.title,
            r.provider,
            r.type,
            r.url,
            r.is_free,
            r.level,
            r.duration,
            r.language,
            r.description,
            r.learning_objectives,
            r.prerequisites,
            now
          ]
        );
      } else if (!existing.description) {
        // Update existing row with rich metadata if it was seeded previously without description
        repo.execute(
          `UPDATE learning_resources
           SET description = ?, learning_objectives = ?, prerequisites = ?
           WHERE id = ?;`,
          [r.description, r.learning_objectives, r.prerequisites, r.id]
        );
      }
    }
  });

  const total = repository.queryOne('SELECT COUNT(*) as count FROM learning_resources;');
  return { seeded: true, count: total?.count || canonicalResources.length };
}
