export interface TabCategory {
  category: string;
  tabIds: number[];
}

export type CategoryRuleSet = { [key: string]: string[] };

export const DEFAULT_CATEGORY_RULES: CategoryRuleSet = {
  '开发工具': ['github', 'stackoverflow', 'developer', 'npmjs', 'localhost', 'vercel', 'netlify', 'git', 'console'],
  '社交媒体': ['twitter', 'x.com', 'facebook', 'instagram', 'linkedin', 'reddit', 'discord', 'slack', 'messenger', 'whatsapp'],
  '流媒体': ['youtube', 'netflix', 'spotify', 'twitch', 'bilibili', 'vimeo', 'disneyplus'],
  '生产力': ['google.com/docs', 'notion', 'figma', 'trello', 'asana', 'zoom', 'drive.google', 'canva', 'microsoft'],
  '新闻资讯': ['nytimes', 'bbc', 'cnn', 'zhihu', 'hupu', 'medium', 'reuters'],
  '购物搜索': ['amazon', 'ebay', 'taobao', 'jd.com', 'google.com/search', 'bing', 'baidu', 'shopee'],
};

export async function categorizeTabs(
  tabs: { id: number; title: string; url: string }[], 
  rules: CategoryRuleSet = DEFAULT_CATEGORY_RULES
): Promise<TabCategory[]> {
  const result: { [key: string]: number[] } = {};
  const uncategorized: number[] = [];

  tabs.forEach(tab => {
    let matched = false;
    const lowerUrl = tab.url.toLowerCase();
    const lowerTitle = tab.title.toLowerCase();

    for (const [category, keywords] of Object.entries(rules)) {
      if (keywords.some(keyword => lowerUrl.includes(keyword.toLowerCase()) || lowerTitle.includes(keyword.toLowerCase()))) {
        if (!result[category]) result[category] = [];
        result[category].push(tab.id);
        matched = true;
        break;
      }
    }

    if (!matched) {
      uncategorized.push(tab.id);
    }
  });

  const categories: TabCategory[] = Object.entries(result).map(([category, tabIds]) => ({
    category,
    tabIds
  }));

  if (uncategorized.length > 0) {
    // Smart grouping for uncategorized tabs: Group by domain
    const domainGroups: { [key: string]: number[] } = {};
    
    uncategorized.forEach(tabId => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) {
        try {
          const url = new URL(tab.url);
          const domain = url.hostname.replace('www.', '');
          if (!domainGroups[domain]) domainGroups[domain] = [];
          domainGroups[domain].push(tabId);
        } catch {
          if (!domainGroups['其他']) domainGroups['其他'] = [];
          domainGroups['其他'].push(tabId);
        }
      }
    });

    Object.entries(domainGroups).forEach(([domain, tabIds]) => {
      categories.push({ 
        category: domain === '其他' ? '其他' : `未分类: ${domain}`, 
        tabIds 
      });
    });
  }

  return categories;
}
