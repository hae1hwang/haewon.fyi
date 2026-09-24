export const site = {
  name: "Haewon Hwang",
  role: "Senior UX Designer",
  tagline: "I design products that make complicated things feel obvious.",
  location: "San Francisco, CA",
  email: "hello@haewon.fyi",
  resumeUrl: "#",
  socials: [
    { label: "LinkedIn", href: "#" },
    { label: "Dribbble", href: "#" },
    { label: "Read.cv", href: "#" },
  ],
  about: {
    bio: [
      "I'm a senior UX designer currently leading design for YouTube TV's core surfaces — from the Library experience to sign-in and identity, across TV, web, mobile, and tablet.",
      "Before YouTube, I led UX for new editing and creation features in Google Photos, and years earlier was the first and only designer at an early-stage startup, where I built the company's design system from scratch.",
      "I studied Information Science at Cornell, with a business minor and an almost-finished fine arts minor. Outside of work, I write about design craft and spend too much time redesigning things that don't need redesigning.",
    ],
    companies: ["YouTube", "Google", "Uber", "Facebook"],
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
  projects: [
    {
      slug: "youtube-tv-library",
      title: "Redesigning the YouTube TV Library experience",
      summary:
        "Leading UX across TV, web, mobile, and tablet for one of YouTube TV's core surfaces, including a new sign-in and identity experience.",
      tags: ["TV platform", "Cross-platform", "Identity"],
      year: "2018–Present",
    },
    {
      slug: "signac-design-system",
      title: "Building a startup's design system from the ground up",
      summary:
        "As the first and only designer at Signac, led UX end to end and built the company's design system.",
      tags: ["Design systems", "0→1", "Leadership"],
      year: "2016",
    },
    {
      slug: "google-photos-books",
      title: "Bringing new creation tools to Google Photos Books",
      summary:
        "Designed, prototyped, tested, and launched new editing and creation features across web, iOS, Android, and tablet.",
      tags: ["Consumer", "0→1", "Mobile"],
      year: "2017–2018",
    },
    {
      slug: "uber-driver-app",
      title: "Enhancing the driver experience on Uber's partner app",
      summary:
        "Improved core flows for drivers on Uber's partner app during a summer internship on the driver experience team.",
      tags: ["Mobile", "Consumer"],
      year: "2016",
    },
  ],
};

export type Project = (typeof site.projects)[number];
