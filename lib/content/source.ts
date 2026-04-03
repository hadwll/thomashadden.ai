import type { ContentPageResponse, PublicContentItem } from '@/lib/content/types';

const HOME_TEASER_SUMMARY = `Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at Park Electrical Belfast as a Siemens automation specialist, delivering control system upgrades and technical solutions for water treatment and process industries. Alongside his commercial role, he is undertaking a part-time PhD at Ulster University, investigating how AI and digital twin technologies can be applied to real-world industrial control. Industrial Analytics & Automation is his independent platform for technical projects and research.`;

const ABOUT_SUMMARY = `Thomas Hadden is an engineer and applied AI researcher based in Northern Ireland. He works at the intersection of industrial automation, process control, and artificial intelligence, with a focus on making these technologies practical, safe, and useful in real operational environments.

Thomas currently holds two roles. As an Application Engineer at Park Electrical Belfast, he works within the Automation Department as a Siemens specialist, delivering advanced control system design, servo drive upgrades, and automation solutions for clients across water treatment, wastewater, and process industries. He works closely with integrators, end users, and Siemens technical teams to specify, validate, and commission systems that meet demanding requirements for reliability and long-term supportability.

Alongside his role at Park, Thomas is undertaking a part-time PhD at Ulster University. The research programme - AI-Driven Innovation in Industrial and Process Control Systems (AIPCon) - investigates how reinforcement learning and digital twin methodologies can be applied to real-world process control, with a particular emphasis on the gap between academic theory and industrial adoption. Thomas Hadden's research pays close attention to the practical constraints that most academic work overlooks: process non-linearities, sensor limitations, safety requirements, and integration with existing PLC-based control architectures.

Industrial Analytics & Automation (IA&A) is Thomas's independent platform for technical projects, research-led development, and applied AI work outside his employed role. It is not a separate company in the traditional sense - it is a vehicle for the kind of work that sits between industry and academia: building things, testing ideas, and publishing findings that are grounded in real engineering problems.

Thomas Hadden's career began with a higher-level apprenticeship at Kilroot Power Station, working across high-voltage systems, fire detection upgrades, and industrial maintenance in a heavily regulated environment. From there he moved into food manufacturing at Moy Park, progressing from Electrical Maintenance Technician to Engineering Shift Manager, where he led a team of seven technicians, drove continuous improvement programmes, and headed an SAP Plant Maintenance implementation across five sites. He then spent time as a contract Automation and Controls Engineer through IA&A, delivering production-critical automation projects in food manufacturing environments before joining Park Electrical in 2023.

Academically, Thomas holds a BEng (Hons) in Mechatronic Engineering (First Class) and an MSc in Internet of Things (Distinction), both from Ulster University. He is a Member of the Institution of Engineering and Technology (MIET) and an Incorporated Engineer (IEng), working toward Chartered Engineer registration. He delivers an annual guest lecture on industrial control systems to BSc Mechatronics students at Ulster University, and has contributed to the PORTAS research project - a REPHRAIN-funded initiative using machine learning to detect indicators of human trafficking in online job advertisements.

The technical domains Thomas Hadden works across include: Siemens PLC and drive systems (S7-1200, S7-1500, S120, G120), industrial networking (SCALANCE, Profinet, Modbus), digital twin modelling (Simcenter Flomaster), reinforcement learning for control, computer vision and deep learning, condition-based monitoring, and process automation for water, wastewater, and food manufacturing environments.

This site exists to share that work - the projects, the research, and the practical thinking that connects AI to industry. If you are a business owner wondering where AI fits, an integrator looking for technical support, or a researcher interested in collaboration, Thomas is interested in that conversation.`;

const CONTACT_INTRO_SUMMARY = `If you're thinking about where AI fits in your business, exploring automation for an engineering or process environment, or interested in research collaboration, I'd like to hear from you. I work across industrial automation, applied AI, and control systems, and I'm always open to conversations with business owners, integrators, and fellow engineers who are working through similar problems. Whether it's a specific technical question, a project you're considering, or a broader conversation about AI readiness, drop me a message below and I'll get back to you.`;

const HOME_SECTIONS: PublicContentItem[] = [
  {
    id: 'home-about-teaser',
    title: 'About Thomas',
    slug: 'home-about-teaser',
    summary: HOME_TEASER_SUMMARY,
    updatedAt: '2026-03-20T09:00:00Z',
    tags: ['Industrial AI', 'Automation', 'Research']
  },
  {
    id: 'home-readiness',
    title: 'How AI-ready is your business?',
    slug: 'home-readiness',
    summary: 'A practical two-minute diagnostic to identify realistic AI next steps.',
    updatedAt: '2026-03-20T09:00:00Z',
    category: 'readiness'
  }
];

const ABOUT_SECTIONS: PublicContentItem[] = [
  {
    id: 'about-overview',
    title: 'About Thomas',
    slug: 'about-overview',
    summary: ABOUT_SUMMARY,
    updatedAt: '2026-03-18T10:00:00Z',
    location: 'Northern Ireland',
    tags: ['Park Electrical Belfast', 'Ulster University', 'Industrial Analytics & Automation']
  }
];

const PROJECT_ITEMS: PublicContentItem[] = [
  {
    id: 'servo-drive-upgrade-wastewater',
    title: 'Servo Drive Upgrade for Wastewater Treatment',
    slug: 'servo-drive-upgrade-wastewater',
    summary:
      'A full servo control system upgrade on an automated sludge press used in wastewater treatment, replacing an obsolete Siemens 611U platform with a modern S120 drive system. The project was delivered through Park Electrical Belfast for an NI Water integrator client.',
    updatedAt: '2026-03-17T10:30:00Z',
    category: 'Industrial Automation',
    status: 'completed',
    featured: true,
    location: 'Northern Ireland'
  },
  {
    id: 'alpr-vehicle-tracking',
    title: 'Automatic Licence Plate Recognition System',
    slug: 'alpr-vehicle-tracking',
    summary:
      'A bespoke Automatic Licence Plate Recognition system designed and built for a waste management and land regeneration business, combining edge computing, solar power management, cloud-based plate recognition, and automated compliance reporting. No suitable off-the-shelf solution existed for the operational constraints.',
    updatedAt: '2026-03-16T10:30:00Z',
    category: 'Applied AI',
    status: 'completed',
    featured: true,
    location: 'Northern Ireland'
  },
  {
    id: 'date-code-vision-classifier',
    title: 'Date Code Vision System',
    slug: 'date-code-vision-classifier',
    summary:
      'A deep learning vision system built to classify date codes on packaging in a live food manufacturing environment, using a convolutional neural network running on a Raspberry Pi. Developed as an MSc project at Ulster University and designed to solve a real quality control problem that had cost the business tens of thousands of pounds.',
    updatedAt: '2026-03-15T10:30:00Z',
    category: 'AI & Computer Vision',
    status: 'completed',
    featured: true,
    location: 'Northern Ireland'
  }
];

const RESEARCH_ITEMS: PublicContentItem[] = [
  {
    id: 'bearing-fault-detection-wavelet',
    title: 'Bearing Fault Detection Using Wavelet Methods and Machine Learning',
    slug: 'bearing-fault-detection-wavelet',
    summary:
      'Research into detecting roller element bearing faults using wavelet decomposition and unsupervised machine learning, eliminating the need for application-specific equipment configuration. Co-authored with Dr Muhammad Usman Hadi at Ulster University and submitted to Elsevier.',
    updatedAt: '2026-03-14T10:30:00Z',
    theme: 'Applied AI',
    status: 'completed',
    featured: true,
    tags: ['Condition Monitoring', 'Machine Learning']
  },
  {
    id: 'phd-ai-process-control',
    title: 'AI-Driven Innovation in Industrial and Process Control Systems',
    slug: 'phd-ai-process-control',
    summary:
      'A part-time PhD at Ulster University investigating how reinforcement learning and digital twin methodologies can be applied to real-world industrial process control, with a focus on the gap between academic theory and practical adoption in safety-critical environments.',
    updatedAt: '2026-03-13T10:30:00Z',
    theme: 'Industrial AI',
    status: 'active',
    featured: true,
    tags: ['Reinforcement Learning', 'Digital Twins']
  }
];

const CONTACT_ITEMS: PublicContentItem[] = [
  {
    id: 'contact-intro',
    title: 'Contact Introduction',
    slug: 'contact-intro',
    summary: CONTACT_INTRO_SUMMARY,
    updatedAt: '2026-03-12T10:30:00Z',
    tags: ['AI', 'Automation', 'Research']
  }
];

const INSIGHT_ITEMS: PublicContentItem[] = [
  {
    id: 'example-insight',
    title: 'Example Insight',
    slug: 'example-insight',
    summary: 'Reference insight item used for slug and pagination contract coverage.',
    updatedAt: '2026-03-19T09:30:00Z',
    publishedAt: '2026-03-19T09:30:00Z',
    tags: ['Insights', 'AI']
  },
  {
    id: 'ai-adoption-shifts-2026',
    title: 'Where AI Adoption Is Actually Moving in 2026',
    slug: 'ai-adoption-shifts-2026',
    summary: 'A practical read on adoption patterns seen across engineering and operations teams.',
    updatedAt: '2026-03-16T08:00:00Z',
    publishedAt: '2026-03-16T08:00:00Z',
    tags: ['Adoption', 'Strategy']
  },
  {
    id: 'signal-over-noise-rag',
    title: 'Signal Over Noise in RAG Deployments',
    slug: 'signal-over-noise-rag',
    summary: 'Lessons from reducing hallucination risk with tighter retrieval policies.',
    updatedAt: '2026-03-13T11:10:00Z',
    publishedAt: '2026-03-13T11:10:00Z',
    tags: ['RAG', 'Reliability']
  },
  {
    id: 'small-teams-automation-playbook',
    title: 'Automation Playbook for Small Technical Teams',
    slug: 'small-teams-automation-playbook',
    summary: 'How smaller teams can sequence AI and automation decisions without overreach.',
    updatedAt: '2026-03-08T07:40:00Z',
    publishedAt: '2026-03-08T07:40:00Z',
    tags: ['Automation', 'SME']
  }
];

export const HOME_CONTENT: ContentPageResponse = {
  page: 'home',
  title: 'Home',
  sections: HOME_SECTIONS,
  lastUpdated: '2026-03-20T09:00:00Z'
};

export const ABOUT_CONTENT: ContentPageResponse = {
  page: 'about',
  title: 'About',
  sections: ABOUT_SECTIONS,
  lastUpdated: '2026-03-18T10:00:00Z'
};

export const PROJECTS_CONTENT: ContentPageResponse = {
  page: 'projects',
  title: 'Projects',
  sections: PROJECT_ITEMS,
  lastUpdated: '2026-03-15T10:30:00Z'
};

export const RESEARCH_CONTENT: ContentPageResponse = {
  page: 'research',
  title: 'Research',
  sections: RESEARCH_ITEMS,
  lastUpdated: '2026-03-14T14:00:00Z'
};

export const CONTACT_CONTENT: ContentPageResponse = {
  page: 'contact',
  title: 'Contact',
  sections: CONTACT_ITEMS,
  lastUpdated: '2026-03-12T10:30:00Z'
};

export const INSIGHTS_CONTENT: ContentPageResponse = {
  page: 'insights',
  title: 'Insights',
  sections: INSIGHT_ITEMS,
  lastUpdated: '2026-03-19T09:30:00Z'
};
