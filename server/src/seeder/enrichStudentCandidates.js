import { initDb } from '../config/db.js';
import { repository } from '../data/repository.js';
import { randomUUID as uuidv4 } from 'node:crypto';

export function enrichPipelineSeedData() {
  initDb();
  console.log('Enriching Recruiter Pipeline with realistic student candidates...');

  const orgId = 'org-demo-1';
  const now = new Date();

  // Clean up previous unit test noise applications from org-demo-1
  repository.execute(`
    DELETE FROM application_stage_history 
    WHERE application_id IN (
      SELECT id FROM applications 
      WHERE org_id = ? AND (candidate_id LIKE 'usr-s1-%' OR candidate_id LIKE 'usr-s2-%' OR candidate_id LIKE 'usr-pipeline-test-%' OR candidate_id LIKE 'cand-stage1-test-%')
    );
  `, [orgId]);

  repository.execute(`
    DELETE FROM applications 
    WHERE org_id = ? AND (candidate_id LIKE 'usr-s1-%' OR candidate_id LIKE 'usr-s2-%' OR candidate_id LIKE 'usr-pipeline-test-%' OR candidate_id LIKE 'cand-stage1-test-%');
  `, [orgId]);

  // Comprehensive, realistic, diverse student candidate dataset
  const studentCandidates = [
    {
      id: 'usr-cand-1',
      app_id: 'app-1',
      email: 'aarav.patel@example.com',
      name: 'Aarav Patel',
      institution: 'IIT Bombay',
      degree: 'B.Tech Computer Science and Engineering',
      graduation_year: 2025,
      cgpa: 9.42,
      location: 'Mumbai, India',
      headline: 'Full-Stack & Cloud Systems | React, TypeScript, Go | Google Summer of Code Contributor',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'shortlisted',
      match_score: 93,
      applied_days_ago: 12,
      updated_days_ago: 3,
      assessment_score: 91,
      tags: ['Top 5%', 'GSoC Contributor', 'Immediate Joiner'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-nodejs', 'sk-postgres'],
      projects: [
        { title: 'DevPulse - Distributed Telemetry Dashboard', url: 'https://github.com/aarav/devpulse', stars: 140 },
        { title: 'TypeSQL - Automated Type-Safe Query Builder', url: 'https://github.com/aarav/typesql', stars: 85 },
        { title: 'CampusConnect - Realtime Peer Tutoring App', url: 'https://github.com/aarav/campusconnect', stars: 45 }
      ],
      certs: ['AWS Certified Cloud Practitioner', 'Meta Certified Frontend Specialist']
    },
    {
      id: 'usr-cand-2',
      app_id: 'app-2',
      email: 'diya.sharma@example.com',
      name: 'Diya Sharma',
      institution: 'BITS Pilani',
      degree: 'B.E. Computer Science',
      graduation_year: 2025,
      cgpa: 9.68,
      location: 'Hyderabad, India',
      headline: 'Generative AI & LLM Systems Researcher | PyTorch, Vector Search, FastAPI',
      target_role: 'Machine Learning Engineer',
      experience_years: 0,
      job_id: 'job-2',
      stage: 'interview_scheduled',
      match_score: 96,
      applied_days_ago: 8,
      updated_days_ago: 2,
      assessment_score: 95,
      tags: ['Hackathon Winner', 'Published Research', 'Top 5%'],
      verified_skills: ['sk-rag', 'sk-llm-fine', 'sk-pytorch', 'sk-scikit', 'sk-postgres'],
      projects: [
        { title: 'NeuralRecall - Context-Aware Semantic RAG', url: 'https://github.com/diya/neuralrecall', stars: 320 },
        { title: 'MedLlama - Domain-Adapted Clinical QA Agent', url: 'https://github.com/diya/medllama', stars: 195 }
      ],
      certs: ['DeepLearning.AI Generative AI with LLMs', 'TensorFlow Developer Certificate']
    },
    {
      id: 'usr-cand-3',
      app_id: 'app-3',
      email: 'rohan.iyer@example.com',
      name: 'Rohan Iyer',
      institution: 'IIIT Hyderabad',
      degree: 'B.Tech Computer Science & MS by Research',
      graduation_year: 2024,
      cgpa: 8.85,
      location: 'Bangalore, India',
      headline: 'Distributed Systems & Go Microservices Enthusiast | Kafka, Docker, Kubernetes',
      target_role: 'Backend Systems Engineer',
      experience_years: 0,
      job_id: 'job-3',
      stage: 'interview_completed',
      match_score: 94,
      applied_days_ago: 15,
      updated_days_ago: 1,
      assessment_score: 92,
      tags: ['Strong DS/Algo', 'Core Contributor'],
      verified_skills: ['sk-golang', 'sk-kafka', 'sk-postgres', 'sk-redis', 'sk-docker'],
      projects: [
        { title: 'StreamMesh - High-Throughput Pub/Sub Broker', url: 'https://github.com/rohan/streammesh', stars: 210 },
        { title: 'RaftKV - Fault-Tolerant Replicated State Machine', url: 'https://github.com/rohan/raftkv', stars: 165 },
        { title: 'GoProfiler - Zero-Overhead Memory Allocation Tracker', url: 'https://github.com/rohan/goprofiler', stars: 90 }
      ],
      certs: ['CKA: Certified Kubernetes Administrator']
    },
    {
      id: 'usr-cand-4',
      app_id: 'app-4',
      email: 'ananya.reddy@example.com',
      name: 'Ananya Reddy',
      institution: 'NIT Trichy',
      degree: 'B.Tech Information Technology',
      graduation_year: 2025,
      cgpa: 8.92,
      location: 'Chennai, India',
      headline: 'DevOps & Site Reliability Engineer | Terraform, Kubernetes, Helm, GitHub Actions',
      target_role: 'Cloud & DevOps Engineer',
      experience_years: 0,
      job_id: 'job-4',
      stage: 'under_review',
      match_score: 89,
      applied_days_ago: 5,
      updated_days_ago: 4,
      assessment_score: 87,
      tags: ['Cloud Certified', 'Strong CI/CD'],
      verified_skills: ['sk-k8s', 'sk-docker', 'sk-terraform', 'sk-aws'],
      projects: [
        { title: 'GitOps-Engine - Automated Multi-Cluster Delivery', url: 'https://github.com/ananya/gitops-engine', stars: 110 },
        { title: 'Terraform-AWS-VPC - High-Availability Infrastructure Blueprint', url: 'https://github.com/ananya/tf-vpc', stars: 75 }
      ],
      certs: ['AWS Solutions Architect Associate', 'HashiCorp Certified Terraform Associate']
    },
    {
      id: 'usr-cand-5',
      app_id: 'app-cand-student-05',
      email: 'kabir.verma@example.com',
      name: 'Kabir Verma',
      institution: 'Delhi Technological University (DTU)',
      degree: 'B.Tech Software Engineering',
      graduation_year: 2026,
      cgpa: 8.45,
      location: 'Delhi NCR, India',
      headline: 'Frontend Engineer | React, Next.js 14, TailwindCSS, State Management & Animations',
      target_role: 'Frontend Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'new_applicant',
      match_score: 86,
      applied_days_ago: 6,
      updated_days_ago: 2,
      assessment_score: 82,
      tags: ['Frontend Star', 'UI/UX Polish'],
      verified_skills: ['sk-react', 'sk-nextjs', 'sk-tailwind', 'sk-typescript'],
      projects: [
        { title: 'Aceternity-Clone - Micro-Interaction Component Kit', url: 'https://github.com/kabir/aceternity-clone', stars: 180 },
        { title: 'SaaSify - Next.js Multi-Tenant Billing Portal', url: 'https://github.com/kabir/saasify', stars: 120 }
      ],
      certs: ['Meta Advanced React Certificate']
    },
    {
      id: 'usr-cand-3',
      app_id: 'app-5',
      email: 'rohan.iyer@example.com',
      name: 'Rohan Iyer',
      institution: 'IIIT Hyderabad',
      degree: 'B.Tech Computer Science & MS by Research',
      graduation_year: 2024,
      cgpa: 8.85,
      location: 'Bangalore, India',
      headline: 'Distributed Systems & Go Microservices Enthusiast | Kafka, Docker, Kubernetes',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'new_applicant',
      match_score: 54,
      applied_days_ago: 10,
      updated_days_ago: 1,
      assessment_score: 75,
      tags: ['Backend Focus'],
      verified_skills: ['sk-golang', 'sk-postgres'],
      projects: [],
      certs: []
    },
    {
      id: 'cand-student-06',
      email: 'meera.nair@iitd.ac.in',
      name: 'Meera Nair',
      institution: 'IIT Delhi',
      degree: 'B.Tech Electrical & Computer Engineering',
      graduation_year: 2024,
      cgpa: 9.75,
      location: 'Delhi, India',
      headline: 'Full-Stack Developer & Problem Solver | Competitive Programming Rank < 100',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'offer_extended',
      match_score: 97,
      applied_days_ago: 20,
      updated_days_ago: 2,
      assessment_score: 98,
      tags: ['Top 5%', 'Offer Pending', 'Competitive Programmer'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-nodejs', 'sk-postgres', 'sk-graphql'],
      projects: [
        { title: 'GraphCommerce - Sub-50ms Headless E-commerce Core', url: 'https://github.com/meera/graphcommerce', stars: 410 },
        { title: 'AlgoVisualizer - Interactive Graph & DP Algorithm Studio', url: 'https://github.com/meera/algoviz', stars: 290 }
      ],
      certs: ['MongoDB Certified Developer', 'AWS Certified Developer Associate']
    },
    {
      id: 'cand-student-07',
      email: 'siddharth.rao@rvce.edu.in',
      name: 'Siddharth Rao',
      institution: 'RV College of Engineering',
      degree: 'B.E. Computer Science',
      graduation_year: 2025,
      cgpa: 8.60,
      location: 'Bangalore, India',
      headline: 'Node.js Microservices & API Developer | Express, Redis, PostgreSQL',
      target_role: 'Backend Developer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'new_applicant',
      match_score: 79,
      applied_days_ago: 2,
      updated_days_ago: 2,
      assessment_score: 78,
      tags: ['API Specialist', 'Local Candidate'],
      verified_skills: ['sk-nodejs', 'sk-express', 'sk-postgres', 'sk-redis'],
      projects: [
        { title: 'PayGuard - Idempotent Stripe & Razorpay Webhook Gateway', url: 'https://github.com/siddharth/payguard', stars: 95 },
        { title: 'RateLimiter-Redis - Sliding Window Rate Limiting Middleware', url: 'https://github.com/siddharth/rl-redis', stars: 65 }
      ],
      certs: ['PostgreSQL 15 Certified Professional']
    },
    {
      id: 'cand-student-08',
      email: 'tanvi.deshmukh@coep.ac.in',
      name: 'Tanvi Deshmukh',
      institution: 'COEP Technological University',
      degree: 'B.Tech Information Technology',
      graduation_year: 2025,
      cgpa: 9.15,
      location: 'Pune, India',
      headline: 'Full-Stack React & Node Developer | Open Source Enthusiast',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'under_review',
      match_score: 88,
      applied_days_ago: 4,
      updated_days_ago: 3,
      assessment_score: 85,
      tags: ['Top 5%', 'Hackathon Winner'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-nodejs', 'sk-tailwind'],
      projects: [
        { title: 'TaskFlow - Realtime Collaborative Kanban with CRDTs', url: 'https://github.com/tanvi/taskflow', stars: 155 },
        { title: 'CleanCode-Linter - AST Plugin for Enterprise Standards', url: 'https://github.com/tanvi/cleancode', stars: 70 }
      ],
      certs: ['Node.js Application Development (LFW211)']
    },
    {
      id: 'cand-student-09',
      email: 'ishaan.joshi@iiita.ac.in',
      name: 'Ishaan Joshi',
      institution: 'IIIT Allahabad',
      degree: 'B.Tech Information Technology',
      graduation_year: 2026,
      cgpa: 7.90,
      location: 'Noida, India',
      headline: 'Full-Stack Junior Developer | Passionate about Modern React & WebSockets',
      target_role: 'Junior Full-Stack Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'new_applicant',
      match_score: 64,
      applied_days_ago: 1,
      updated_days_ago: 1,
      assessment_score: 68,
      tags: ['Fast Learner'],
      verified_skills: ['sk-react', 'sk-nodejs'],
      projects: [
        { title: 'ChatSphere - End-to-End Encrypted Rooms', url: 'https://github.com/ishaan/chatsphere', stars: 35 }
      ],
      certs: []
    },
    {
      id: 'cand-student-10',
      email: 'priya.venkat@psgtech.edu',
      name: 'Priya Venkataraman',
      institution: 'PSG College of Technology',
      degree: 'B.E. Computer Science',
      graduation_year: 2024,
      cgpa: 9.50,
      location: 'Coimbatore, India',
      headline: 'Software Engineer (Hired) | React, TypeScript, Cloud Native Architecture',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'hired',
      match_score: 95,
      applied_days_ago: 30,
      updated_days_ago: 5,
      assessment_score: 96,
      tags: ['Accepted Offer', 'Top Performer'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-nodejs', 'sk-aws', 'sk-postgres'],
      projects: [
        { title: 'OmniChannel - Unified Customer Support Queue', url: 'https://github.com/priya/omnichannel', stars: 280 },
        { title: 'MicroAuth - High-Performance OAuth2 / OIDC Server', url: 'https://github.com/priya/microauth', stars: 190 }
      ],
      certs: ['AWS Certified Solutions Architect', 'Docker Certified Associate']
    },
    {
      id: 'cand-student-11',
      email: 'aditya.choudhury@iitkgp.ac.in',
      name: 'Aditya Choudhury',
      institution: 'IIT Kharagpur',
      degree: 'Integrated M.Tech Computer Science',
      graduation_year: 2025,
      cgpa: 9.30,
      location: 'Kolkata, India',
      headline: 'AI & Deep Learning Engineer | PyTorch, Computer Vision, Multi-Modal Systems',
      target_role: 'Machine Learning Engineer',
      experience_years: 0,
      job_id: 'job-2',
      stage: 'shortlisted',
      match_score: 91,
      applied_days_ago: 9,
      updated_days_ago: 4,
      assessment_score: 89,
      tags: ['Research Fellow', 'Strong Math'],
      verified_skills: ['sk-pytorch', 'sk-scikit', 'sk-rag'],
      projects: [
        { title: 'VisionPrompt - Zero-Shot Object Segmentation', url: 'https://github.com/aditya/visionprompt', stars: 240 }
      ],
      certs: ['DeepLearning.AI Deep Learning Specialization']
    },
    {
      id: 'cand-student-12',
      email: 'sneha.kulkarni@vjti.ac.in',
      name: 'Sneha Kulkarni',
      institution: 'VJTI Mumbai',
      degree: 'B.Tech Information Technology',
      graduation_year: 2025,
      cgpa: 8.75,
      location: 'Mumbai, India',
      headline: 'Kubernetes & Infrastructure Automation Engineer | Go, Docker, Cloud-Native',
      target_role: 'DevOps Engineer',
      experience_years: 0,
      job_id: 'job-4',
      stage: 'interview_scheduled',
      match_score: 90,
      applied_days_ago: 11,
      updated_days_ago: 1,
      assessment_score: 91,
      tags: ['KubeCon Speaker', 'Top 5%'],
      verified_skills: ['sk-k8s', 'sk-docker', 'sk-terraform', 'sk-golang'],
      projects: [
        { title: 'KubeWatchdog - Node Failure Automated Remediation', url: 'https://github.com/sneha/kubewatchdog', stars: 175 }
      ],
      certs: ['CKAD: Certified Kubernetes Application Developer']
    },
    {
      id: 'cand-student-13',
      email: 'devansh.mathur@thapar.edu',
      name: 'Devansh Mathur',
      institution: 'Thapar Institute of Engineering & Technology',
      degree: 'B.E. Computer Science',
      graduation_year: 2026,
      cgpa: 7.60,
      location: 'Chandigarh, India',
      headline: 'Student Web Developer | Learning React & Tailwind',
      target_role: 'Frontend Intern',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'under_review',
      match_score: 48,
      applied_days_ago: 3,
      updated_days_ago: 2,
      assessment_score: 55,
      tags: ['Below Bar', 'Entry Level'],
      verified_skills: ['sk-react'],
      projects: [
        { title: 'Portfolio-V1 - Personal Showcase Site', url: 'https://github.com/devansh/portfolio-v1', stars: 12 }
      ],
      certs: []
    },
    {
      id: 'cand-student-14',
      email: 'riya.sen@ju.ac.in',
      name: 'Riya Sen',
      institution: 'Jadavpur University',
      degree: 'B.E. Information Technology',
      graduation_year: 2025,
      cgpa: 9.20,
      location: 'Kolkata, India',
      headline: 'Full-Stack TypeScript Developer | React 18, Next.js, Node.js, GraphQL',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'assessment_invited',
      match_score: 89,
      applied_days_ago: 7,
      updated_days_ago: 2,
      assessment_score: 88,
      tags: ['Hackathon Winner', 'High Velocity'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-graphql', 'sk-nodejs'],
      projects: [
        { title: 'DocuSync - Operational Transformation Editor', url: 'https://github.com/riya/docusync', stars: 215 },
        { title: 'QuickMock - Zero-Config Mock Server CLI', url: 'https://github.com/riya/quickmock', stars: 130 }
      ],
      certs: ['GraphQL Certified Associate']
    },
    {
      id: 'cand-student-15',
      email: 'arjun.menon@nitc.ac.in',
      name: 'Arjun Menon',
      institution: 'NIT Calicut',
      degree: 'B.Tech Computer Science',
      graduation_year: 2024,
      cgpa: 8.50,
      location: 'Kochi, India',
      headline: 'Distributed Systems & Go Developer | Kafka, Redis, gRPC',
      target_role: 'Backend Software Engineer',
      experience_years: 0,
      job_id: 'job-3',
      stage: 'new_applicant',
      match_score: 84,
      applied_days_ago: 2,
      updated_days_ago: 2,
      assessment_score: 81,
      tags: ['Immediate Joiner', 'Backend Focus'],
      verified_skills: ['sk-golang', 'sk-redis', 'sk-postgres'],
      projects: [
        { title: 'DistributedLock - Redlock Protocol in Go', url: 'https://github.com/arjun/distributed-lock', stars: 85 }
      ],
      certs: []
    },
    {
      id: 'cand-student-16',
      email: 'pooja.bhatt@manipal.edu',
      name: 'Pooja Bhatt',
      institution: 'Manipal Institute of Technology',
      degree: 'B.Tech Information Technology',
      graduation_year: 2025,
      cgpa: 8.95,
      location: 'Bangalore, India',
      headline: 'Frontend Engineer & Accessibility Advocate | React, WCAG AA, Design Systems',
      target_role: 'Frontend Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'shortlisted',
      match_score: 91,
      applied_days_ago: 10,
      updated_days_ago: 3,
      assessment_score: 90,
      tags: ['A11y Champion', 'Design System Lead'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-tailwind', 'sk-jest'],
      projects: [
        { title: 'A11yDesign - Accessible Headless Component Primitives', url: 'https://github.com/pooja/a11ydesign', stars: 310 },
        { title: 'ColorContrast - Realtime Chrome Accessibility Ext', url: 'https://github.com/pooja/colorcontrast', stars: 145 }
      ],
      certs: ['IAAP Certified Web Accessibility Specialist']
    },
    {
      id: 'cand-student-17',
      email: 'vikram.malhotra@iitr.ac.in',
      name: 'Vikram Malhotra',
      institution: 'IIT Roorkee',
      degree: 'B.Tech Computer Science',
      graduation_year: 2025,
      cgpa: 9.35,
      location: 'Dehradun, India',
      headline: 'Full-Stack Systems Engineer | High Concurrency, WebSockets, React & Go',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'interview_scheduled',
      match_score: 94,
      applied_days_ago: 14,
      updated_days_ago: 3,
      assessment_score: 94,
      tags: ['Top 5%', 'High Concurrency'],
      verified_skills: ['sk-react', 'sk-typescript', 'sk-golang', 'sk-postgres'],
      projects: [
        { title: 'LiveAuction - Sub-10ms Bidding Engine', url: 'https://github.com/vikram/liveauction', stars: 260 },
        { title: 'BinaryProto - Compact Network Serialization Protocol', url: 'https://github.com/vikram/binproto', stars: 115 }
      ],
      certs: ['Confluent Certified Developer for Apache Kafka']
    },
    {
      id: 'cand-student-18',
      email: 'neha.kapoor@nsut.ac.in',
      name: 'Neha Kapoor',
      institution: 'Netaji Subhas University of Technology (NSUT)',
      degree: 'B.Tech Computer Engineering',
      graduation_year: 2026,
      cgpa: 8.80,
      location: 'Delhi, India',
      headline: 'Cloud & Infrastructure Enthusiast | Terraform, Docker, AWS Solutions',
      target_role: 'Cloud Operations Engineer',
      experience_years: 0,
      job_id: 'job-4',
      stage: 'assessment_invited',
      match_score: 85,
      applied_days_ago: 5,
      updated_days_ago: 1,
      assessment_score: 83,
      tags: ['AWS Certified', 'Strong CI/CD'],
      verified_skills: ['sk-aws', 'sk-docker', 'sk-terraform'],
      projects: [
        { title: 'Serverless-Pipeline - Automated Video Transcoder', url: 'https://github.com/neha/serverless-pipeline', stars: 95 }
      ],
      certs: ['AWS Certified Cloud Practitioner']
    },
    {
      id: 'cand-student-19',
      email: 'karthik.s@iitm.ac.in',
      name: 'Karthik Sundaram',
      institution: 'IIT Madras',
      degree: 'B.Tech & M.Tech Dual Degree CSE',
      graduation_year: 2024,
      cgpa: 9.85,
      location: 'Chennai, India',
      headline: 'Principal Potential Graduate | Distributed Consensus, High-Performance Systems',
      target_role: 'Core Systems Architect',
      experience_years: 0,
      job_id: 'job-3',
      stage: 'offer_extended',
      match_score: 98,
      applied_days_ago: 24,
      updated_days_ago: 2,
      assessment_score: 99,
      tags: ['Top 1%', 'Gold Medalist', 'Offer Pending'],
      verified_skills: ['sk-golang', 'sk-kafka', 'sk-postgres', 'sk-redis', 'sk-docker', 'sk-k8s'],
      projects: [
        { title: 'ChandyLamport-Snapshot - Global Distributed Snapshot Engine', url: 'https://github.com/karthik/snapshot', stars: 450 },
        { title: 'FastLSM - High-Write Throughput Log-Structured Merge Tree', url: 'https://github.com/karthik/fastlsm', stars: 380 }
      ],
      certs: ['Linux Foundation Certified Engineer']
    },
    {
      id: 'cand-student-20',
      email: 'bhavna.chawla@srmist.edu.in',
      name: 'Bhavna Chawla',
      institution: 'SRM Institute of Science and Technology',
      degree: 'B.Tech Information Technology',
      graduation_year: 2025,
      cgpa: 8.25,
      location: 'Chennai, India',
      headline: 'Junior Full-Stack Developer | React, Tailwind, Node.js Rest APIs',
      target_role: 'Full-Stack Software Engineer',
      experience_years: 0,
      job_id: 'job-1',
      stage: 'new_applicant',
      match_score: 72,
      applied_days_ago: 3,
      updated_days_ago: 3,
      assessment_score: 74,
      tags: ['Self-Starter'],
      verified_skills: ['sk-react', 'sk-nodejs', 'sk-tailwind'],
      projects: [
        { title: 'EventHub - College Fest Registration Platform', url: 'https://github.com/bhavna/eventhub', stars: 40 }
      ],
      certs: []
    }
  ];

  repository.transaction((repo) => {
    for (const c of studentCandidates) {
      // 1. User account
      repo.execute(`
        INSERT INTO users (
          id, email, password_hash, full_name, role, status, email_verified,
          institution, company_name, timezone, avatar_url, created_at, updated_at
        ) VALUES (
          ?, ?, '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1qgW1mZgLp4oW6oE6fO/8bN/mE4rQW', ?, 'candidate', 'active', 1,
          ?, NULL, 'Asia/Kolkata', ?, datetime('now', ?), datetime('now', ?)
        ) ON CONFLICT(id) DO UPDATE SET
          full_name = excluded.full_name,
          email = excluded.email,
          institution = excluded.institution,
          avatar_url = excluded.avatar_url,
          updated_at = excluded.updated_at;
      `, [
        c.id, c.email, c.name, c.institution,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.name)}`,
        `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
      ]);

      // 2. Candidate profile
      repo.execute(`
        INSERT INTO candidate_profiles (
          id, headline, target_role, bio, experience_years, location,
          degree, graduation_year, cgpa, repo_count, visibility, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, 'public', datetime('now', ?), datetime('now', ?)
        ) ON CONFLICT(id) DO UPDATE SET
          headline = excluded.headline,
          target_role = excluded.target_role,
          bio = excluded.bio,
          experience_years = excluded.experience_years,
          location = excluded.location,
          degree = excluded.degree,
          graduation_year = excluded.graduation_year,
          cgpa = excluded.cgpa,
          repo_count = excluded.repo_count,
          updated_at = excluded.updated_at;
      `, [
        c.id, c.headline, c.target_role,
        `${c.name} is a student candidate at ${c.institution} with a strong academic and project record.`,
        c.experience_years, c.location,
        c.degree, c.graduation_year, c.cgpa, c.projects.length,
        `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
      ]);

      // 3. Verified skills
      for (const skillId of c.verified_skills) {
        repo.execute(`
          INSERT OR REPLACE INTO candidate_skills (
            id, candidate_id, skill_id, proficiency, verification_status, source, last_verified_at, created_at, updated_at
          ) VALUES (
            ?, ?, ?, 4, 'verified', 'platform_assessment', datetime('now', ?), datetime('now', ?), datetime('now', ?)
          );
        `, [
          `cs-${c.id}-${skillId}`, c.id, skillId,
          `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
        ]);
      }

      // 4. Projects (skill_evidence)
      for (let pIdx = 0; pIdx < c.projects.length; pIdx++) {
        const p = c.projects[pIdx];
        const skillId = c.verified_skills[0] || 'sk-react';
        repo.execute(`
          INSERT OR REPLACE INTO skill_evidence (
            id, candidate_id, skill_id, evidence_type, title, reference_url, metadata,
            verification_status, decision_rationale, created_at, updated_at
          ) VALUES (
            ?, ?, ?, 'project_repo', ?, ?, ?,
            'verified', 'Verified source code repository with active commits', datetime('now', ?), datetime('now', ?)
          );
        `, [
          `ev-${c.id}-proj-${pIdx}`, c.id, skillId, p.title, p.url,
          JSON.stringify({ stars: p.stars, language: 'TypeScript' }),
          `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
        ]);
      }

      // 5. Certifications (skill_evidence)
      for (let certIdx = 0; certIdx < c.certs.length; certIdx++) {
        const certName = c.certs[certIdx];
        repo.execute(`
          INSERT OR REPLACE INTO skill_evidence (
            id, candidate_id, skill_id, evidence_type, title, reference_url, metadata,
            verification_status, decision_rationale, created_at, updated_at
          ) VALUES (
            ?, ?, 'sk-aws', 'certificate', ?, 'https://sarathi.ai/verify/cert', '{}',
            'verified', 'Cryptographically verified credential', datetime('now', ?), datetime('now', ?)
          );
        `, [
          `ev-${c.id}-cert-${certIdx}`, c.id, certName,
          `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
        ]);
      }

      // 6. Assessment results
      const templateId = c.job_id === 'job-2' ? 'asmt-genai-rag' : (c.job_id === 'job-3' ? 'asmt-go-micro' : (c.job_id === 'job-4' ? 'asmt-k8s-infra' : 'asmt-react-deep'));
      const passed = c.assessment_score >= 70 ? 1 : 0;
      const asmtAssignId = `asgn-${c.id}`;
      const asmtAttemptId = `att-${c.id}`;

      repo.execute(`
        INSERT OR REPLACE INTO assessment_assignments (
          id, org_id, template_id, candidate_id, job_id, assigned_by, status, attempt_count, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, 'usr-recruiter-1', 'completed', 1, datetime('now', ?), datetime('now', ?)
        );
      `, [asmtAssignId, orgId, templateId, c.id, c.job_id, `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`]);

      repo.execute(`
        INSERT OR REPLACE INTO assessment_attempts (
          id, assignment_id, candidate_id, attempt_number, started_at, submitted_at,
          submission_payload, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, 1, datetime('now', ?), datetime('now', ?),
          '{}', 'graded', datetime('now', ?), datetime('now', ?)
        );
      `, [asmtAttemptId, asmtAssignId, c.id, `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`]);

      repo.execute(`
        INSERT OR REPLACE INTO assessment_results (
          id, attempt_id, candidate_id, template_id, score, max_score, passed,
          rubric_scores, reviewer_feedback, verified_skill_awards, graded_by, graded_at, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, 100.0, ?,
          '{"correctness": 38, "architecture": 28, "testing": 18}',
          'Completed standard assessment with verified test pass rate.', '[]',
          'usr-assessor-1', datetime('now', ?), datetime('now', ?)
        );
      `, [
        `ar-${c.id}`, asmtAttemptId, c.id, templateId, c.assessment_score, passed,
        `-${c.applied_days_ago} days`, `-${c.applied_days_ago} days`
      ]);

      // 7. Application in org-demo-1
      const appId = c.app_id || `app-${c.id}`;
      repo.execute(`
        INSERT OR REPLACE INTO applications (
          id, org_id, job_id, candidate_id, stage, match_score, cover_note, applied_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?)
        );
      `, [
        appId, orgId, c.job_id, c.id, c.stage, c.match_score,
        `Excited to apply for this opportunity at ${orgId}. My background at ${c.institution} aligns well with the requirements.`,
        `-${c.applied_days_ago} days`, `-${c.updated_days_ago} days`
      ]);

      // 8. Stage history
      repo.execute(`
        INSERT OR REPLACE INTO application_stage_history (
          id, application_id, from_stage, to_stage, changed_by, actor_type, reason, created_at
        ) VALUES (
          ?, ?, NULL, ?, 'usr-recruiter-1', 'human', 'Application received and screened by recruitment team', datetime('now', ?)
        );
      `, [
        `ash-${appId}-1`, appId, c.stage, `-${c.updated_days_ago} days`
      ]);

      // 9. Application tags
      for (const tag of c.tags) {
        repo.execute(`
          INSERT OR REPLACE INTO application_tags (
            id, application_id, tag, color, created_at
          ) VALUES (?, ?, ?, 'indigo', datetime('now', ?));
        `, [`tag-${appId}-${tag.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`, appId, tag, `-${c.updated_days_ago} days`]);
      }
    }
  });

  console.log(`Successfully enriched ${studentCandidates.length} diverse student candidates for org-demo-1.`);
}

enrichPipelineSeedData();
