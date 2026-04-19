/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Sparkles, 
  ExternalLink, 
  History,
  Settings,
  X,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  PlusCircle,
  Layout,
  Briefcase
} from 'lucide-react';
import { getOpenTabs, navigateToTab, Tab } from './services/tabService';
import { categorizeTabs, TabCategory, CategoryRuleSet, DEFAULT_CATEGORY_RULES } from './services/aiService';

interface TaskGroup {
  id: string;
  name: string;
  tabs: { url: string; title: string; favIconUrl?: string }[];
}

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-[32px] font-light tracking-[-0.5px] text-text-main">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
    </div>
  );
};

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categories, setCategories] = useState<TabCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Tasks management
  const [tasks, setTasks] = useState<TaskGroup[]>(() => {
    const saved = localStorage.getItem('tabnexus_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Rules management
  const [rules, setRules] = useState<CategoryRuleSet>(() => {
    const saved = localStorage.getItem('tabnexus_rules');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_RULES;
  });

  useEffect(() => {
    localStorage.setItem('tabnexus_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('tabnexus_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const refreshData = async () => {
    const openTabs = await getOpenTabs();
    const result = await categorizeTabs(openTabs, rules);
    setTabs(openTabs);
    setCategories(result);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const openTabs = await getOpenTabs();
      const result = await categorizeTabs(openTabs, rules);
      if (isMounted) {
        setTabs(openTabs);
        setCategories(result);
        setLoading(false);
      }
    }

    init();

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const handleUpdate = () => refreshData();
      chrome.tabs.onCreated.addListener(handleUpdate);
      chrome.tabs.onRemoved.addListener(handleUpdate);
      chrome.tabs.onUpdated.addListener(handleUpdate);
      return () => {
        isMounted = false;
        chrome.tabs.onCreated.removeListener(handleUpdate);
        chrome.tabs.onRemoved.removeListener(handleUpdate);
        chrome.tabs.onUpdated.removeListener(handleUpdate);
      };
    }
    return () => { isMounted = false; };
  }, [rules]);

  const handleCategorize = async (currentTabs: Tab[]) => {
    if (currentTabs.length === 0) return;
    setIsCategorizing(true);
    try {
      const result = await categorizeTabs(currentTabs, rules);
      setCategories(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCategorizing(false);
    }
  };

  const filteredTabs = useMemo(() => {
    // Get all URLs that are currently in a task
    const urlsInTasks = new Set(tasks.flatMap(task => task.tabs.map(t => t.url)));
    
    return tabs.filter(tab => {
      const matchesSearch = tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tab.url.toLowerCase().includes(searchQuery.toLowerCase());
      const notInTask = !urlsInTasks.has(tab.url);
      
      return matchesSearch && notInTask;
    });
  }, [tabs, searchQuery, tasks]);

  const groupedTabs = useMemo(() => {
    if (categories.length === 0 || searchQuery) {
      return [{ category: searchQuery ? '搜索结果' : '常规', tabIds: filteredTabs.map(t => t.id) }];
    }
    return categories;
  }, [categories, filteredTabs, searchQuery]);

  const updateRule = (category: string, keywords: string[]) => {
    setRules(prev => ({ ...prev, [category]: keywords }));
  };

  const addCategory = () => {
    const name = `新分类 ${Object.keys(rules).length + 1}`;
    setRules(prev => ({ ...prev, [name]: [] }));
  };

  const removeCategory = (name: string) => {
    setRules(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Task Handlers
  const addEmptyTask = () => {
    const newTask: TaskGroup = {
      id: crypto.randomUUID(),
      name: `新任务 ${tasks.length + 1}`,
      tabs: []
    };
    setTasks([...tasks, newTask]);
  };

  const removeTask = (id: string, closeTabs: boolean = false) => {
    if (closeTabs) {
      const task = tasks.find(t => t.id === id);
      if (task && typeof chrome !== 'undefined' && chrome.tabs) {
        // Find all open tabs that match the URLs in this task
        const urlsToClose = task.tabs.map(t => t.url);
        chrome.tabs.query({}, (allTabs) => {
          const tabIdsToClose = allTabs
            .filter(t => t.url && urlsToClose.includes(t.url))
            .map(t => t.id as number);
          if (tabIdsToClose.length > 0) {
            chrome.tabs.remove(tabIdsToClose);
          }
        });
      }
    }
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTabToTask = (taskId: string, tab: { url: string; title: string; favIconUrl?: string }) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        // Avoid duplicates
        if (task.tabs.some(t => t.url === tab.url)) return task;
        return { ...task, tabs: [...task.tabs, tab] };
      }
      return task;
    }));
  };

  const removeTabFromTask = (taskId: string, url: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return { ...task, tabs: task.tabs.filter(t => t.url !== url) };
      }
      return task;
    }));
  };

  return (
    <div className="min-h-screen bg-bg p-8 flex flex-col selection:bg-accent/20">
      <header className="max-w-[1600px] w-full mx-auto mb-[40px] flex items-center justify-between">
        <Clock />
        
        <div className="relative w-[400px]">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
          <input 
            type="text" 
            placeholder="在已打开或任务中搜索..." 
            className="w-full bg-card border border-border rounded-[24px] py-[12px] pl-[52px] pr-5 text-sm shadow-[0_2px_6px_rgba(0,0,0,0.02)] focus:border-accent focus:outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
             <button 
              onClick={() => handleCategorize(tabs)}
              disabled={isCategorizing || tabs.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all border
                ${isCategorizing 
                  ? 'bg-slate-50 text-slate-300 border-border cursor-not-allowed' 
                  : 'bg-card text-text-dim hover:text-accent border-border hover:border-accent shadow-sm active:scale-95'}`}
            >
              <Sparkles size={14} className={isCategorizing ? 'animate-pulse' : ''} />
              {isCategorizing ? '整理中...' : '重新整理'}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-card border border-border rounded-full text-text-dim hover:text-accent hover:border-accent transition-all shadow-sm active:scale-95"
            >
              <Settings size={18} />
            </button>
        </div>
      </header>

      <div className="max-w-[1700px] w-full mx-auto grid grid-cols-12 gap-8 flex-1">
        {/* Left: Auto Categories (3/4 width) */}
        <main className="col-span-12 lg:col-span-9">
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
                <p className="text-text-dim text-sm font-medium">同步标签页...</p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              >
                {groupedTabs.map((group) => {
                  const groupTabs = tabs.filter(t => group.tabIds.includes(t.id));
                  const visibleGroupTabs = groupTabs.filter(t => filteredTabs.some(ft => ft.id === t.id));
                  if (visibleGroupTabs.length === 0) return null;

                  return (
                    <section key={group.category} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between px-2">
                        <input 
                          type="text"
                          defaultValue={group.category}
                          onBlur={(e) => {
                            const newName = e.target.value;
                            const oldName = group.category;
                            if (newName === oldName || !newName.trim()) return;

                            setRules(prev => {
                              const next = { ...prev };
                              if (next[oldName]) {
                                const val = next[oldName];
                                delete next[oldName];
                                next[newName] = val;
                              } else {
                                next[newName] = [];
                              }
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] bg-transparent border-0 outline-none hover:bg-accent/5 focus:bg-accent/5 rounded px-1 transition-colors focus:text-accent flex-1 mr-2"
                        />
                        <span className="text-[10px] font-bold text-accent bg-badge px-2 py-0.5 rounded-[10px] min-w-[20px] text-center">
                          {visibleGroupTabs.length}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {visibleGroupTabs.map((tab, i) => (
                          <motion.button
                            key={tab.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('tab_json', JSON.stringify({
                                url: tab.url,
                                title: tab.title,
                                favIconUrl: tab.favIconUrl
                              }));
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (i * 0.01) }}
                            onClick={() => navigateToTab(tab)}
                            className="group theme-card tab-item-hover p-[12px_14px] text-left w-full flex items-center gap-3 cursor-grab active:cursor-grabbing"
                          >
                            <div className="w-4 h-4 rounded-[3px] bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {tab.favIconUrl ? (
                                <img src={tab.favIconUrl} alt="" className="w-3.5 h-3.5" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />
                              ) : (
                                <div className="w-1 h-1 bg-accent/40 rounded-full" />
                              )}
                            </div>
                            <h3 className="text-[13px] text-text-main truncate flex-1 font-normal group-hover:text-accent transition-colors">
                              {tab.title}
                            </h3>
                            <ExternalLink size={10} className="text-text-dim/30 group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                          </motion.button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right: Work Tasks (1/4 width) */}
        <aside className="col-span-12 lg:col-span-3 border-l border-border pl-8 min-h-[500px]">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="flex items-center gap-2 text-[11px] font-bold text-text-dim uppercase tracking-[0.15em]">
              <Briefcase size={14} className="text-accent" />
              工作任务
            </h2>
            <button 
              onClick={addEmptyTask}
              className="text-text-dim hover:text-accent transition-colors active:scale-95"
              title="新建任务集"
            >
              <PlusCircle size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-6">
            <AnimatePresence>
              {tasks.length === 0 ? (
                <div className="py-20 px-4 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center">
                  <p className="text-[13px] text-text-dim font-medium mb-1">暂无主动任务</p>
                  <p className="text-[11px] text-text-dim opacity-50 px-6">拖拽左侧网页到此处或点击右上角新建</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-accent/5', 'ring-1', 'ring-accent/20');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-accent/5', 'ring-1', 'ring-accent/20');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-accent/5', 'ring-1', 'ring-accent/20');
                      const data = e.dataTransfer.getData('tab_json');
                      if (data) {
                        addTabToTask(task.id, JSON.parse(data));
                      }
                    }}
                    className="group bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative"
                  >
                    <div className="flex items-start justify-between">
                      <input 
                        type="text"
                        value={task.name}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, name: newName } : t));
                        }}
                        className="text-[14px] font-bold text-text-main bg-transparent border-0 outline-none hover:bg-bg/50 rounded px-1 transition-colors w-full mr-4"
                      />
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => removeTask(task.id, true)}
                          title="任务结束：关闭该任务所有网页并删除"
                          className="text-text-dim hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                         <button 
                          onClick={() => removeTask(task.id, false)}
                          title="仅删除任务看板"
                          className="text-text-dim/30 hover:text-text-dim opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {task.tabs.length === 0 && (
                        <div className="py-4 border border-dashed border-border/60 rounded-xl text-center">
                          <p className="text-[10px] text-text-dim/40">放入网页...</p>
                        </div>
                      )}
                      {task.tabs.map((tab, idx) => (
                        <div key={idx} className="flex items-center justify-between group/tab p-1.5 hover:bg-bg rounded-lg transition-colors">
                          <button 
                            onClick={() => navigateToTab(tab as Tab)}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <img src={tab.favIconUrl || ''} alt="" className="w-3 h-3 flex-shrink-0" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')}  />
                            <span className="text-[12px] text-text-dim truncate">{tab.title}</span>
                          </button>
                          <button 
                            onClick={() => removeTabFromTask(task.id, tab.url)}
                            className="text-text-dim/20 hover:text-red-500 opacity-0 group-hover/tab:opacity-100 transition-all p-0.5"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      <footer className="max-w-[1600px] w-full mx-auto mt-auto pt-10 border-t border-border flex flex-col items-center gap-4 text-text-dim text-[12px]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <History size={14} />
            <span>最后同步: 刚刚</span>
          </div>
          <button onClick={() => setShowSettings(true)} className="hover:text-accent transition-colors">分类规则设置</button>
          <span>&bull;</span>
          <span>按住网页并拖动至右侧任务栏即可分类</span>
        </div>
      </footer>

      {/* Settings Modal (保持不变，省略部分以节省空间) */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="absolute inset-0 bg-text-main/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl max-h-[80vh] bg-card rounded-[32px] p-8 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">规则设置</h2>
                <button onClick={() => setShowSettings(false)}><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                {(Object.entries(rules) as [string, string[]][]).map(([category, keywords]) => (
                  <div key={category} className="group flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <input 
                        type="text"
                        value={category}
                        onChange={(e) => {
                          const newName = e.target.value;
                          setRules(prev => {
                            const next = { ...prev };
                            const val = next[category];
                            delete next[category];
                            next[newName] = val;
                            return next;
                          });
                        }}
                        className="text-sm font-bold text-text-main p-1 hover:bg-bg border-b border-transparent focus:border-accent outline-none uppercase tracking-widest"
                      />
                      <button 
                        onClick={() => removeCategory(category)}
                        className="p-1.5 text-text-dim hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-badge text-accent rounded-full text-xs font-medium">
                          <span>{kw}</span>
                          <button 
                            onClick={() => {
                              const next = [...keywords];
                              next.splice(i, 1);
                              updateRule(category, next);
                            }}
                            className="hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      <input 
                        type="text"
                        placeholder="添加关键词..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              updateRule(category, [...keywords, val]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="text-xs bg-bg border border-slate-200 rounded-full px-3 py-1 outline-none focus:border-accent text-text-dim"
                      />
                    </div>
                  </div>
                ))}

                <button 
                  onClick={addCategory}
                  className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-text-dim hover:text-accent hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus size={18} />
                  <span>添加新分类</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

