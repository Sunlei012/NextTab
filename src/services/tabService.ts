export interface Tab {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

export async function getOpenTabs(): Promise<Tab[]> {
  // Check if running as a Chrome extension
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        resolve(tabs.map(t => ({
          id: t.id || Math.random(),
          title: t.title || 'Untitled',
          url: t.url || '',
          favIconUrl: t.favIconUrl
        })));
      });
    });
  }

  // Mock data for development environment
  return [
    { id: 1, title: 'React Documentation', url: 'https://react.dev', favIconUrl: 'https://react.dev/favicon.ico' },
    { id: 2, title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com', favIconUrl: 'https://tailwindcss.com/favicon.ico' },
    { id: 3, title: 'Gemini AI API', url: 'https://ai.google.dev', favIconUrl: 'https://ai.google.dev/favicon.ico' },
    { id: 4, title: 'GitHub: TabNexus Project', url: 'https://github.com', favIconUrl: 'https://github.com/favicon.ico' },
    { id: 5, title: 'Figma: Design System', url: 'https://figma.com', favIconUrl: 'https://figma.com/favicon.ico' },
    { id: 6, title: 'Vite Guide', url: 'https://vitejs.dev', favIconUrl: 'https://vitejs.dev/favicon.ico' },
    { id: 7, title: 'MDN Web Docs', url: 'https://developer.mozilla.org', favIconUrl: 'https://developer.mozilla.org/favicon.ico' },
    { id: 8, title: 'Slack | Communication', url: 'https://slack.com', favIconUrl: 'https://slack.com/favicon.ico' },
  ];
}

export function navigateToTab(tab: Tab) {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.update) {
    // If it's already open, we might want to switch to it
    // But user asked: "在他打开一个新的空白标签时...点击这些已经打开的标签页，会在这个新tab中直接打开"
    // This implies using the current tab for navigation.
    chrome.tabs.update({ url: tab.url });
  } else {
    // Development mockup: just log or window.location
    console.log(`Navigating current tab to: ${tab.url}`);
    window.location.href = tab.url;
  }
}
