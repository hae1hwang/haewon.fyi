// a phrase in the about timeline that opens a project from the work folder
export type AboutLink = { text: string; folder: string; project: string };
// `message` is what a single project window says until its case study is ready
// (it takes priority over the folder's `placeholder`)
export type WorkItem = { title: string; platform?: string; comingSoon?: boolean; message?: string };
// `placeholder` is what the folder's project windows say until there are case studies
// `locked` folders ask for a password before any of their projects open
export type WorkFolder = { name: string; items: WorkItem[]; placeholder?: string; locked?: boolean };

export const site = {
  name: "Haewon Hwang",
  role: "Senior UX Designer",
  tagline: "I design products that make complicated things feel obvious.",
  location: "New York, NY",
  email: "haewonhwang1@gmail.com",
  // Formspree form that delivers the Contact window's messages
  formspreeId: "mrperpko",
  resumeUrl: "/haewon-hwang-resume.pdf",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/haewonhwang/" },
    { label: "Dribbble", href: "#" },
    { label: "Read.cv", href: "#" },
  ],
  about: {
    timeline: [
      {
        year: "2026",
        text: "YouTube TV, senior designer. Most recently, led the product and design direction for innovative experiences such as Multiview from 0 → 100. Also the design lead for core experiences such as the Library and Watch pages, sign-in and identity across TV, web, mobile, and tablet, and did visioning/redesign work alongside vis D.",
        links: [
          { text: "Multiview", folder: "YouTube TV", project: "Multiview" },
          { text: "Library", folder: "YouTube TV", project: "Library" },
          { text: "Watch", folder: "YouTube TV", project: "Watch" },
          { text: "sign-in and identity", folder: "YouTube TV", project: "Identity" },
        ],
      },
      {
        year: "2018",
        text: "YouTube Living Room, senior designer. Owned the entire Identity domain, creating ways to sign in on the TV, as well as everything identity-related across platforms.",
        links: [{ text: "Identity", folder: "YouTube Living Room", project: "Identity" }],
      },
      {
        year: "2017",
        text: "Google Photos, designer. Created the collage building experience for Photo Books on mobile, tablet and web.",
        links: [{ text: "collage", folder: "Google Photos", project: "Creation & editing" }],
      },
      {
        year: "2014",
        text: "Internships: Signac, Uber, Ericsson Mediaroom, Facebook FBU.",
      },
    ],
    education:
      "Education: Cornell University 2017, BA in Information Science",
  },
  experience: [
    {
      company: "YouTube",
      period: "2018 – Present",
      roles: [
        {
          title: "YouTube TV",
          description:
            "Leading UX on core YouTube TV surfaces (such as the Library), mostly for the TV platform, but also across web, mobile, and tablet. Also bringing my years of expertise on Identity for TV (from YTLR) to improve the sign-in experience to YTV.",
        },
        {
          title: "YouTube Living Room (YTLR)",
          description:
            "Led the UX on spearheading the identity space for YouTube Living Room (LR; the TV platform of the main YouTube app).",
        },
      ],
    },
    {
      company: "Google",
      period: "2017 – 2018",
      roles: [
        {
          title: "Google Photos",
          description:
            "Led the UX for new editing and creation features to the Photo Books business in Google Photos. Designed, prototyped, tested, and launched the features across all Photos platforms (web, iOS, Android, tablet).",
        },
      ],
    },
    {
      company: "Internships",
      period: "2014 – 2017",
      roles: [
        {
          title: "Signac // Winter 2016",
          description:
            "Led the company's UX as the first and only designer, built Signac's design system.",
        },
        {
          title: "Uber // Summer 2016",
          description: "Enhanced the driver experience on the partner app.",
        },
        {
          title: "Belle Apps // Winter 2015",
          description:
            "Designer & frontend dev for iOS apps, Android apps, and websites for various clients.",
        },
        {
          title: "Ericsson // Summer 2015",
          description:
            "UX designer & developer for VR experiences (scripted in C# and built in Unity3D).",
        },
        {
          title: "Facebook // Summer 2014",
          description: "iOS dev. eng. for the inaugural FBU program.",
        },
      ],
    },
  ],
  education: [
    {
      school: "Cornell",
      period: "2013 – 2017",
      description:
        "B.A. Information Science, magna cum laude. Business minor. (almost) Fine arts minor. Teaching assistant, lecturer, research assistant, mentor, photographer.",
    },
  ],
  // top-level folders in the work window; item titles are placeholders
  // until the case studies exist
  // top-level folders in the fun window; placeholders until there's real content
  funFolders: [
    { name: "Photography", items: [{ title: "Coming soon", comingSoon: true }] },
    { name: "Side projects", items: [{ title: "Coming soon", comingSoon: true }] },
  ] as WorkFolder[],
  workFolders: [
    {
      name: "YouTube TV",
      locked: true,
      placeholder: "Stay tuned...",
      items: [
        { title: "Multiview", platform: "TV, Mobile/Tablet", message: "Going live Monday, Oct 26" },
        { title: "Watch", platform: "TV" },
        { title: "Library", platform: "TV" },
        { title: "Identity", platform: "TV" },
      ],
    },
    {
      name: "YouTube Living Room",
      locked: true,
      placeholder: "Stay tuned...",
      items: [{ title: "Identity", platform: "TV, Mobile", message: "Going live Monday, Oct 26" }],
    },
    {
      name: "Google Photos",
      locked: true,
      placeholder: "Coming soon",
      items: [{ title: "Creation & editing", platform: "Mobile, Web" }],
    },
    {
      name: "Vibe coding",
      items: [{ title: "Portfolio site", platform: "Web, Mobile web", message: "Going live Sunday October 25" }],
    },
  ] as WorkFolder[],
};
