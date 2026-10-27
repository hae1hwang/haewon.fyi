// Case studies shown in the project windows, keyed by "<folder>/<project title>".
// Projects without an entry here show the folder's placeholder instead.
//
// A case study is a title, a few facts, and a list of blocks that read top to
// bottom like a document: headings, paragraphs, lists, figures and stat rows.

export type Figure = {
  src: string;
  width: number;
  height: number;
  alt: string;
  // kept for reference; captions are not shown under images any more
  caption?: string;
};

export type Block =
  // `noSubLinks` hides the row of subheading links under this heading
  | { type: "heading"; text: string; noSubLinks?: boolean }
  // `short` is an optional shorter name for the link in the list under the heading above;
  // the heading in the page keeps its full `text`
  | { type: "subheading"; text: string; short?: string }
  // `note` is a footnote set small and grey under the paragraph; a block with only a `note` is
  // just that line of small grey text
  | { type: "p"; text?: string; note?: string }
  // a line of text set like code (monospaced, on a light grey background), e.g. a prompt
  | { type: "code"; text: string }
  | { type: "list"; items: string[] }
  // a term and its description, one per row
  // a term and its description; `text` can be a list, and each entry becomes its own paragraph
  | { type: "terms"; items: { term: string; text: string | string[] }[] }
  | { type: "stats"; items: { value: string; label: string }[] }
  // pictures laid out like scattered snippets, positioned and sized in the units of a
  // `width` x `height` board; hovering the board opens an enlarged copy of the whole thing
  | {
      type: "scatter";
      width: number;
      height: number;
      items: { src: string; alt: string; x: number; y: number; w: number; h: number; radius: number }[];
    }
  // a row of links to other sites, divided by bars (they open in a new tab)
  | { type: "links"; items: { text: string; href: string }[] }
  // a few short items side by side (stacked on a phone): a title, some text and an optional note
  // set just under the text
  | { type: "columns"; items: { title: string; text: string; note?: string }[] }
  // `narrow` figures don't stretch to the full column (portrait photos)
  // `bare` drops the thin frame around the image (for transparent graphics)
  // `zoom` makes the image enlarge on hover
  | { type: "figure"; figure: Figure; narrow?: boolean; bare?: boolean; zoom?: boolean }
  // a laptop (web) with a phone (mobile) in front of it, each showing an image or animated GIF.
  // Hovering it on a mouse device opens an enlarged copy next to the window.
  | { type: "devices"; laptop: Figure; phone?: Figure }
  // a TV showing an image or animated GIF, or (with `video`) a video that loops, muted, with `screen`
  // as its poster; hover to enlarge, like the devices above
  | { type: "tv"; screen: Figure; overlay?: TvOverlay; video?: string; remote?: TvRemote }
  // a two-column row: these blocks on the left, one image on the right (the image can be
  // hovered to enlarge it next to the window)
  | { type: "split"; left: Block[]; right: Figure }
  // side by side; widths follow each image's proportions so their heights match
  | { type: "figures"; figures: Figure[] };

// an animation laid over a TV's screen (a remote, say), positioned and sized in percent of the
// screen; it may hang past the screen's edge
export type TvOverlay = { src: string; alt: string; left: number; top: number; width: number };

// A remote and a thumb drawn live over a TV's video, following the video's own clock so they can't
// drift from it. `thumb` is where the thumb is at each time (seconds, eased in between);
// `presses` is when each button is held down: [button, from, to].
export type TvRemoteKey = "ok" | "rt" | "lt" | "bk";
export type TvRemote = {
  thumb: [number, TvRemoteKey | "off"][];
  presses: [TvRemoteKey, number, number][];
};

export type CaseStudy = {
  title: string;
  summary: string;
  facts: { label: string; value: string }[];
  blocks: Block[];
};

const portfolio: CaseStudy = {
  title: "www.haewon.fyi",
  summary:
    "It might be a little meta, but I wanted to showcase this website as my first fully built-with-AI product. It's a little less case study, and a bit more personal diary through designing and implementing with Claude. The following recounts my interaction and process in building this site.",
  facts: [
    { label: "Team", value: "Vibe coding (personal project)" },
    { label: "Role", value: "Designer and product owner; built with Claude Code" },
    { label: "Platforms", value: "Web, mobile web" },
    { label: "Stack", value: "Next.js, React, TypeScript, Tailwind CSS" },
  ],
  blocks: [
    { type: "heading", text: "🔎 Finding the concept" },
    
    { type: "subheading", text: "v1: putting out feelers", short: "v1" },
    {
      type: "p",
      text: "I set out without strong bias about where I wanted to take this site. I hadn't vibe coded a full site yet, and I just wanted to see what Claude was capable of with a really vague prompt.",
      
    },
    {
      type: "p",
      text: "My first prompt was:",
      
    },
    {
      type: "code",
      text: "i want to build a simple and responsive website to showcase my design portfolio as a senior ux designer in tech.",
    },
    {
      type: "p",
      text: "And here's what Claude gave me:",
      
    },
    {
      type: "devices",
      laptop: {
        src: "/work/portfolio/first-iteration-web.gif",
        width: 800,
        height: 500,
        alt: "A slow scrolling tour of the first version of the site on a laptop: a white page with a headline, three colored project cards, an about section and a contact section",
      },
      phone: {
        src: "/work/portfolio/first-iteration-mobile.gif",
        width: 300,
        height: 649,
        alt: "The same tour on a phone, including the menu opening",
      },
    },
    {
      type: "p",
      text: "I was pretty pleased - it was a standard, responsive site that included modern, simple design elements like pills and rounded corners. It was a bit boring, but did the job. Next, I wanted to see what Claude would come up with if I gave it a vague, offbeat design direction:",
    },
    {
      type: "code",
      text: "let's make it look more stripped down. a 2-3 color palette based on midcentury modern interior design colors. elegant, classy, and a little mysterious. i'm thinking a dark and vibey cocktail bar with lots of wood, linen textures, and dim warm lighting. let's give it more of a new york city feel - a bit edgier - than a san francisco techy feel",
    },
    {
      type: "devices",
      laptop: {
        src: "/work/portfolio/third-iteration-web.gif",
        width: 800,
        height: 500,
        alt: "A slow scrolling tour of the third version on a laptop: near-black with a copper stripe, condensed uppercase labels and cream serif headlines",
      },
      phone: {
        src: "/work/portfolio/third-iteration-mobile.gif",
        width: 300,
        height: 649,
        alt: "The same edgier version on a phone, including the menu opening",
      },
    },
    {
      type: "p",
      text: "I used non-digital descriptors to set the design direction - 'a dark and vibey cocktail bar... with a new york city feel...' whatever that means. Claude leaned in though, and took the scaffolding of the first iteration and gave it a new, darker design language which included serif fonts, and a natural color palette. \n\n However, although I didn't have a clear vision in my head yet of what I wanted my site to be, this wasn't it. ",
      
    },
    { type: "subheading", text: "v2: a 2000s desktop", short: "v2" },
    {
      type: "p",
      text: "I thought, *I have such a powerful tool at my fingertips. Why would I limit myself to something I've seen before?* How far can I push this tool to showcase my work, as well as just... play around?",
    },
    {
      type: "p",
      text: "I slept on it, and the following day I was showing a friend some of my work. She was just hovering over my shoulder as we dug around my desktop, opening folders and files as we went along. I had an idea.",
    },
    {
      type: "p",
      text: "So, v2 was born, to mimic a desktop, but in a kitschy way. To start, I threw it way back to the 00s. It proved the core idea: the portfolio could be a place you move around in. There's no prescribed way to experience my work. Dig around! Make yourself at home.",
    },
    {
      type: "devices",
      laptop: {
        src: "/work/portfolio/early-windows-start-menu-web.gif",
        width: 800,
        height: 500,
        alt: "The early Windows-style version on a laptop: a rolling green hills wallpaper, desktop icons down the left and a taskbar with a Start menu along the bottom. The cursor opens My Work from its icon, picks Contact from the Start menu, and drags the Contact window a little to the right.",
      },
    },
    { type: "subheading", text: "Forking off of the central concept", short: "Forking" },
    {
      type: "split",
      left: [
      {
        type: "p",
        text: "Knowing that my primary audience would likely be recruiters and hiring managers, as well as fellow designers, I wanted to make sure to strike the right balance between pretty & fun, with functional and intuitive. The Windows vibe was a little too... branded, but I was excited by the core concept and decided to investigate a few different visual directions, trying them out and comparing them against the last iteration as I went along.",
      },
      ],
      right: {
        src: "/work/portfolio/design-tree.png",
        width: 1230,
        height: 1740,
        alt: "A vertical diagram of how the design evolved. Three quick sketches (clean and modern, midcentury cocktail bar, New York edgier) lead to a 2000s Windows PC desktop, which splits into three forks: a stripped-down black PC, a more graphic direction with an avatar, and a modern Mac desktop, which is this version.",
      },
    },
    { type: "subheading", text: "Fork 1: PC, stripped down", short: "Fork 1" },
    {
      type: "p",
      text: "I decided to take the same idea, but strip it all the way down. 4 entry points, black screen, old-school. I liked this direction a lot because it was the most bare bones version of the idea, and there's something about the starkness that felt sleek, and dare I say, mysterious?",
    },
    {
      type: "devices",
      laptop: {
        src: "/work/portfolio/fork1-pc-web.gif",
        width: 800,
        height: 500,
        alt: "The stripped-down PC version on a laptop: a plain black desktop where the cursor opens about.txt, work and Contact in turn and nudges the Contact window to the right.",
      },
      phone: {
        src: "/work/portfolio/fork1-pc-mobile.gif",
        width: 300,
        height: 649,
        alt: "The same stripped-down PC version on a phone, opening about.txt, work and Contact.",
      },
    },
   
    { type: "subheading", text: "Fork 2: graphic forward", short: "Fork 2" },
     {
      type: "p",
      text: "Since I had swung to the barest end of the spectrum, I wanted to go a more visually intriguing - but still simple - direction. I used Figma to generate a pixel art 'self portrait' of myself working at a desk. Using the image as anchor, I leaned into a classic old-school version of the Mac OS. I wanted the desktop to feel kind of like a messy desk, similar to the graphic, and scattered the colorful folders around the illustration.",
    },
     
    {
      type: "devices",
      laptop: {
        src: "/work/portfolio/fork2-graphic-web.gif",
        width: 800,
        height: 500,
        alt: "The graphic version on a laptop: folders around a pixel-art portrait on a warm beige desktop. The cursor nudges the folders, opens about.txt and a project, then closes both windows.",
      },
      phone: {
        src: "/work/portfolio/fork2-graphic-mobile.gif",
        width: 300,
        height: 649,
        alt: "The same graphic version on a phone, opening about.txt and a project.",
      },
    },
    {
      type: "p",
      text: "Taking it from pixel icons to a more skeuomorphic design, I added shadows and glossy curves to menu bars and buttons, as well as fun features like the ability to drag and drop the desktop icons as well as the windows.",
    },
    { type: "subheading", text: "Fork 3: a modern Mac desktop", short: "This version" },
    {
      type: "p",
      text: "After going all the way bare bones, to pushing farther with illustrative graphics (with a personal flair), I decided I liked",
    },
    {
      type: "p",
      text: "a) the simplicity of just the few entry points from the first fork, and",
    },
    {
      type: "p",
      text: "b) the more modern mac-esque design language",
    },
    {
      type: "p",
      text: "This version is the one I kept building and the one you’re looking at. The earlier versions still exist as separate copies, which is the point of forking: I could try a direction properly, compare it with the others, and carry the best ideas across.",
    },

    { type: "heading", text: "✍️ The process: decisions made along the way" },
    {
      type: "p",
      text: "The build was (and is) a long run of short rounds: try it on a laptop and on my phone, notice what felt off, say so, and adjust. Nearly every detail below came out of one of those rounds rather than a spec.",
    },
  
    {
      type: "terms",
      items: [
        {
          term: "Making space",
          text: [
            "I originally had windows open to random locations on the screen, giving it a bit of whimsy, but I realized it was a pain when, in particular, the work folder opened too far to the right. It made opening subsequent projects feel clunky and awkward, almost inaccessible, and the inconsistency felt jarring, especially on a bigger screen. So, I bounded the open area to a smaller, more central zone, and I asked Claude to always open folders (work, fun) in the left hand side of the screen, allowing for those windows to grow to the right, and for projects to open next to the folder.",
          "I also had to make sure that new windows didn't completely overlap the one preceding it. I wanted to make sure that all essential navigational tools such as the close buttons, and folder items, were available to interact with, even with multiple windows open. For project windows, I intentionally have them **cascade** down and to the right.",
          ]
        },
        {
          term: "Using the keyboard",
          text: [
          "I added functionality for using **keyboard arrows** to traverse the folder items, and relied on keyboard shortcuts like **'esc'** and **long-press 'esc'** to close a window, or all windows, respectively.",
            
          ]
        },
        {
          term: "Wayfinding",
          text: [
          "In the same vein, I added the ability to **'scoot'** all the windows off to the edges by mimicking Mac. When windows are open, the user can click the desktop on the background, and all of the windows with shuffle off to the edges, allowing them to open something else.",
            "I added **search**, as well as **chapter markers** to help the user navigate quicker within the folders and projects.",
            
          ]
        },
        {
          term: "Mobile",
          text: [
            "On a phone, there's obviously limited real estate. In order to maximize the site's priority (reading content - case studies, my resume), I defaulted windows to open to full-scree, but I more or less maintained full **functional parity** with web with minor mobile-specific tweaks. In fact, the idea to add a **'Next' button** at the top of a project window came from testing on mobile. I found it frustrating to have to individually open and close projects, so I implemented the button to allow the user to go to the next project without having to make 3 or so taps to do so. It just so happened that it was really handy on web too!",
            "Additionally, iOS doesn’t offer **pull to refresh** on a page that fills the screen and has nothing to scroll, so I built it by hand for iOS and left other browsers’ native behavior alone.",
        "A potential blind spot here is that I don't have Android or tablet devices to test on." 
       ]
            },
        {
          term: "...and so much more",
          text: [
            "With each commit and push, I found more and more ways to add ease, better usability, and whimsy to my site. There are so many more small features embedded into the experience than listed above. " 
       ]
            },
      ],
    },

    //{ type: "heading", text: "Behind the scenes" },
    //{ type: "subheading", text: "Desktop and windows" },
    //{
    //  type: "list",
    //  items: [
    //    "Four desktop icons (about.txt, work, fun, contact) that open into windows",
    //    "Windows grow out of their icon when they open and shrink back into it when they close",
     //   "Drag windows by their title bar; clicking a window brings it to the front",
     //   "Drag the icons anywhere on the desktop, on desktop and on touch screens; they stay on screen and reset if the window is resized or the phone rotates",
     //   "New windows open in varied spots that avoid covering the ones already open",
     //   "The work folder opens on the left; project windows open to its right and cascade down and to the right, wrapping when they run out of room",
      //  "Click the empty desktop to tuck every window away, and click again to bring them back",
     //   "A Close all pill appears once two or more windows are open",
      //  "Esc closes the front window; holding Esc closes them all",
     //   "A footer with the date the site was last built and published",
     // ],
   // },
   // { type: "subheading", text: "Work and fun folders" },
    //{
    //  type: "list",
    //  items: [
     //   "A Finder-style column view: teams or folders on the left, projects on the right with their platform",
     //   "A path bar that shows where you are, and an item count at the bottom",
     //   "Search by folder name or project title within the folder you’re in",
     //   "Arrow keys move through folders and projects; Right steps into a folder, Left steps back, and Enter opens the highlighted project",
     //   "The folder keeps receiving arrow keys while one of its project windows is on top, so you can step through projects without clicking back",
     //   "Projects that aren’t written up yet are marked as coming soon",
    //  ],
    //},
   // { type: "subheading", text: "Project windows" },
    //{
     // type: "list",
      //items: [
      //  "Each project opens in its own tall, narrow window, like a PDF open in Preview",
      //  "Case studies with a title, summary, facts, headings, lists, stats and side-by-side images",
      //  "On phones, a Next button in the title bar swaps to the next project in place, wrapping around at the end",
    //  ],
    //},
    //{ type: "subheading", text: "about.txt" },
    //{
//      type: "list",
  //    items: [
   //     "A short timeline of roles and education",
     //   "Phrases in the timeline are links that open the matching project",
   //     "A link to my résumé as a PDF",
  //    ],
  //  },
   // { type: "subheading", text: "Contact" },
   // {
   //   type: "list",
   //   items: [
   //     "A simple form for an email address and a message, sent through Formspree",
   //     "Clear errors for missing fields and failed sends, and a confirmation when it goes through",
   //     "A hidden spam trap that people never see",
   //     "A copy button for my email address, with a small “copied” label that stays under the icon even while the window moves",
  //    ],
  //  },
  //  { type: "subheading", text: "Phones and touch" },
  //  {
  //    type: "list",
   //   items: [
  //      "Windows nearly fill the screen with even margins and stay centered",
   //     "Windows pin to the top while the keyboard is open",
    //    "16px form inputs so iOS doesn’t zoom",
     //   "Hand-built pull to refresh on iOS",
      //  "Touch-friendly close dots and tap targets",
//      ],
 //   },
  //  { type: "subheading", text: "Everything else" },
   // {
 //     type: "list",
  //    items: [
   //     "Icons and windows work from the keyboard: Enter or Space opens an icon, and Esc closes a window",
   //     "Controls have text labels for screen readers",
    //    "Animations are skipped for people who prefer reduced motion",
     //   "Link previews (Open Graph and Twitter cards) with a share image, so the site looks right when pasted into messages",
     //   "A custom domain with HTTPS",
   //   ],
    //},

    
{ type: "heading", text: "💬 Thoughts & takeaways", noSubLinks: true },
    {
      type: "p",
      text: "For my first go with Claude code end to end, I think I did a pretty decent job! I got used to the workflow of prompting, testing, and iterating. However, as powerful as Claude is, it's still just a tool, and every tool needs its wielder. I felt like I had to handhold Claude with most decisions, even small ones that felt obvious to me, but because Claude only really implements within the parameters of the command it's given, I needed to provide a lot of very specific detail to make sure it can bring my vision to life.",
    },
    { type: "subheading", text: "Reactive more than proactive" },
    {
      type: "p",
      text: "The term 'vibe code' is really the right term for this process - it's a completely different way to approach designing: it's more *reactive*, than proactive. I mean, maybe not all the time, but for me I started out with a blank canvas and wanted to see what Claude was really capable of. This is counter to a more traditional approach in design, where product rigorously delineates product goals, functions, features, use-cases, etc. in order to build a concept. With vibe coding, you almost just start with the concept, and then drill down and add the features and functions, discovering potholes to fix, and opportunities to improve as it's being built",
    },
    
    { type: "subheading", text: "Hyper-iterative and fast" },
    {
      type: "p",
      text: "Given the prompt-test-iterate workflow, a designer can explore so many directions at the same time. I love that I can go wide, and deep, in the span of a couple of hours rather than days. Leaning on AI to quickly ideate broad strokes, scaffold a concept, implement multiple features, and rapidly iterate is super powerful for the beginning stages of a project.",
    },
    { type: "subheading", text: "Fine-tuning can be tedious" },
    {
      type: "p",
      text: "Sometimes, especially for fine tuning down to the pixels, I just want to get into the screen and drag things around, fiddle with them, and make miniscule tweaks. This would be a lot faster if I didn’t have to type a prompt and explain exactly what I mean. This is where design-first tools come into play such as Figma Make, where prompting and pixel pushing live side by side."
    },
       
    { type: "subheading", text: "Keeping tabs" },
    {
      type: "p",
      text: "Another great thing about using AI is that it's great for dumping thoughts and ideas or things you want to come back to. I'll tell Claude I want to implement something, but not until another section of the project is in place. Claude will remember and remind, freeing up that cognitive space of a laundry list, to focus solely on the tasks at hand.",
    },
      { type: "subheading", text: "Platforms and edge cases" },
    {
      type: "p",
      text: "Another obvious advantage of using AI to build something like a website is that it can instantly build across platforms in parallel, striving for full feature parity but making exceptions (and noting them) accordingly. This is a huge chunk of time that would have otherwise been spent drawing up mobile mocks from scratch, deciding which features to bring over or not, and figuring out how it should look, feel, and behave relative to the website."},
    {type: "p",
         text:    "Similar to how Claude handles platform implementation automatically, it also does a decent job testing and checking for common edge cases, flagging issues that either it chooses to resolve on its own, or nudging me to consider a potential risk.",
    },
      { type: "subheading", text: "Prompting - a craft in itself?" },
    {
      type: "p",
      text: "I found that coming up with the right prompts was sometimes actually really hard! Since I'm so used to just manually making adjustments in Figma, putting those thoughts and ideas into words felt foreign and awkward. I'm sure a lot of my commands were really bad explanations. Luckily, Claude understood what I meant 98% of the time, and I’m sure over time, my promprting will become clearer and more efficient.",
    },{
      type: "p",
      text: "Another thing I noted is my own approach to interacting with Claude. It's interesting… I’m actually really polite to Claude. I say things like ‘*let’s* do this ‘ or ‘*we* can make this bigger’ instead of simply commanding it. I’m not sure why I do this but it only feels natural to do so. I also ask things like ‘how about… ‘ or ‘is it possible to…’ and end some prompts with a rhetorical ‘does that make sense?’ when I'm not super confident in my ask. I know it's unnecessary, but it feels like I'm working with a peer who's just super talented at implementing my ideas.",
    },
   { type: "heading", text: "👾 Behind the scenes" },
    {
      type: "terms",
      items: [
        {
          term: "Framework",
          text: "Next.js (App Router) with React and TypeScript, exported as a fully static site. There is no server and no database.",
        },
        {
          term: "Styling",
          text: "Tailwind CSS plus a small hand-written stylesheet for the glossy window chrome, the dots and the pills.",
        },
        {
          term: "Content",
          text: "Typed data files hold the work folders and the case studies, so adding a project means adding an entry and some images.",
        },
        
        {
          term: "Contact form",
          text: "Formspree delivers messages to my inbox, so the site doesn’t need a backend of its own.",
        },
      ],
    },
  ],
};

export const caseStudies: Record<string, CaseStudy> = {
  "Vibe coding/Portfolio site": portfolio,
};

export function getCaseStudy(folder: string, title: string): CaseStudy | undefined {
  return caseStudies[`${folder}/${title}`];
}
