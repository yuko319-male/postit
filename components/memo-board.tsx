"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PostIt } from "@/components/ui/post-it";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Memo {
  id: string;
  content: string;
  rotate: number;
  color: string;
  timestamp: number;
  category: string;
}

const POSTIT_COLORS = [
  "#fef08a", // Yellow
  "#fecaca", // Pink
  "#bbf7d0", // Green
  "#bfdbfe", // Blue
];

const DEFAULT_CATEGORIES = ["할 일", "아이디어", "기타"];
const CATEGORIES_STORAGE_KEY = "yuko-categories";
const MEMOS_STORAGE_KEY = "yuko-memos";

import { Filter, ChevronDown, Tags, Settings, Trash2, Edit2, Plus, Check, Download, Upload } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

export function MemoBoard() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [newMemo, setNewMemo] = useState("");
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("전체");
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ original: string; current: string } | null>(null);

  // Load from localStorage on mount and sync from Google Sheets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const savedMemos = localStorage.getItem(MEMOS_STORAGE_KEY);
        if (savedMemos) setMemos(JSON.parse(savedMemos));
        
        const savedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (savedCategories) {
          const parsed = JSON.parse(savedCategories);
          setCategories(parsed);
          setSelectedCategory(parsed[0] || "기타");
        } else {
          setSelectedCategory(DEFAULT_CATEGORIES[0]);
        }

        // Try to fetch from Google Sheets and merge/overwrite
        setIsSyncing(true);
        const response = await fetch("/api/memos");
        if (response.ok) {
          const data = await response.json();
          if (data.memos && data.memos.length > 0) {
            // Mapping from SheetRow back to Memo
            const sheetMemos: Memo[] = data.memos
              .filter((m: any) => m && m.id) // 유효한 데이터만 걸러냄
              .map((m: any) => ({
                id: m.id,
                content: m.content || "",
                category: m.category || "기타",
                color: m.color || "#fef08a",
                timestamp: m.datetime ? new Date(m.datetime).getTime() : Date.now(),
                rotate: Math.random() * 6 - 3,
              }));
            
            if (sheetMemos.length > 0) {
              setMemos(sheetMemos);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setIsSyncing(false);
      }
      setEnabled(true);
    };
    
    fetchData();
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MEMOS_STORAGE_KEY && e.newValue) {
        setMemos(JSON.parse(e.newValue));
      }
      if (e.key === CATEGORIES_STORAGE_KEY && e.newValue) {
        setCategories(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save to localStorage when memos or categories change
  useEffect(() => {
    if (!enabled) return;
    try {
      localStorage.setItem(MEMOS_STORAGE_KEY, JSON.stringify(memos));
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    } catch (err) {
      console.error("Failed to save data:", err);
    }
  }, [memos, categories, enabled]);

  const addMemo = useCallback(async () => {
    if (!newMemo.trim()) return;

    const randomColor = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)];
    const now = Date.now();
    const memo: Memo = {
      id: crypto.randomUUID(),
      content: newMemo,
      rotate: Math.random() * 6 - 3,
      color: randomColor,
      timestamp: now,
      category: selectedCategory,
    };

    setMemos((prevMemos) => [memo, ...prevMemos]);
    setNewMemo("");

    // Sync to Google Sheets
    setIsSyncing(true);
    try {
      await fetch("/api/memos", {
        method: "POST",
        body: JSON.stringify({
          id: memo.id,
          content: memo.content,
          category: memo.category,
          color: memo.color,
          datetime: new Date(now).toLocaleString(),
        }),
      });
    } catch (error) {
      console.error("Failed to sync new memo:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [newMemo, selectedCategory]);

  const deleteMemo = useCallback(async (id: string) => {
    setMemos((prevMemos) => prevMemos.filter((m) => m.id !== id));
    
    // Sync to Google Sheets
    setIsSyncing(true);
    try {
      await fetch("/api/memos", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Failed to delete memo from sheet:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const updateMemo = useCallback(async (id: string, newContent: string) => {
    let updatedMemo: Memo | undefined;
    setMemos((prevMemos) => 
      prevMemos.map((m) => {
        if (m.id === id) {
          updatedMemo = { ...m, content: newContent };
          return updatedMemo;
        }
        return m;
      })
    );

    if (updatedMemo) {
      // Sync to Google Sheets
      setIsSyncing(true);
      try {
        await fetch("/api/memos", {
          method: "PUT",
          body: JSON.stringify({
            id: updatedMemo.id,
            content: updatedMemo.content,
            category: updatedMemo.category,
            color: updatedMemo.color,
            datetime: new Date(updatedMemo.timestamp).toLocaleString(),
          }),
        });
      } catch (error) {
        console.error("Failed to update memo in sheet:", error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, []);

  const addCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories([...categories, trimmed]);
    setNewCategoryName("");
  };

  const deleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) return;
    
    const newCats = categories.filter(c => c !== catToDelete);
    setCategories(newCats);
    
    // Update memos to first available cat
    setMemos(prev => prev.map(m => m.category === catToDelete ? { ...m, category: newCats[0] } : m));
    
    if (selectedCategory === catToDelete) setSelectedCategory(newCats[0]);
    if (filterCategory === catToDelete) setFilterCategory("전체");
  };

  const updateCategoryName = () => {
    if (!editingCategory || !editingCategory.current.trim()) return;
    const { original, current } = editingCategory;
    if (original === current) {
      setEditingCategory(null);
      return;
    }

    setCategories(prev => prev.map(c => c === original ? current : c));
    setMemos(prev => prev.map(m => m.category === original ? { ...m, category: current } : m));
    
    if (selectedCategory === original) setSelectedCategory(current);
    if (filterCategory === original) setFilterCategory(current);
    
    setEditingCategory(null);
  };

  const exportData = () => {
    const data = JSON.stringify({ memos, categories }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yuko-postit-backup-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (parsed.memos && Array.isArray(parsed.memos)) {
          setMemos(parsed.memos);
        }
        if (parsed.categories && Array.isArray(parsed.categories)) {
          setCategories(parsed.categories);
        }
        
        alert("Data successfully restored!");
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to import file. Please make sure it's a valid backup JSON.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(memos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setMemos(items);
  }, [memos]);

  const filteredMemos = Array.isArray(memos) ? memos.filter((m) => {
    const matchesSearch = (m?.content || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "전체" || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  if (!enabled) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12 flex flex-col gap-12">
      {/* Search and Input area */}
      <div className="flex flex-col gap-6 sticky top-8 z-30 bg-background/80 backdrop-blur-xl p-8 rounded-3xl border border-border shadow-2xl shadow-yellow-200/20 dark:shadow-yellow-900/10 active:shadow-yellow-400/20 transition-all">
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
          <div className="flex w-full lg:w-auto gap-3 items-center">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-muted/30 border-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:bg-muted/10 text-lg"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-14 px-6 rounded-2xl bg-muted/20 border-none flex gap-2 font-semibold min-w-[120px]">
                  <Filter className="h-4 w-4" />
                  {filterCategory}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl p-2 min-w-[140px] border-border/50 backdrop-blur-xl">
                <DropdownMenuLabel className="flex items-center gap-2 text-xs opacity-50">
                  <Filter className="h-3 w-3" />
                  Filter Category
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["전체", ...categories].map((cat) => (
                  <DropdownMenuItem 
                    key={cat} 
                    onClick={() => setFilterCategory(cat)}
                    className={cn(
                      "rounded-xl cursor-pointer p-3 font-medium transition-colors mb-1",
                      filterCategory === cat ? "bg-yellow-400 text-neutral-900" : "hover:bg-muted/50"
                    )}
                  >
                    {cat}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl bg-muted/20 border-none relative">
                  <Settings className="h-5 w-5" />
                  {isSyncing && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse border-2 border-background" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-border/50 backdrop-blur-3xl bg-background/80 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                    <Settings className="h-6 w-6 text-yellow-500" />
                    Settings & Backup
                  </DialogTitle>
                </DialogHeader>
                
                <div className="flex flex-col gap-8 py-4">
                  {/* Categories Section */}
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold opacity-50 flex items-center gap-2">
                      <Tags className="h-4 w-4" />
                      Manage Categories
                    </h3>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="New category..." 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCategory()}
                        className="h-12 rounded-xl bg-muted/30 border-none transition-all focus-visible:ring-1 focus-visible:ring-yellow-400"
                      />
                      <Button onClick={addCategory} size="icon" className="h-12 w-12 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-neutral-900">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {categories.map((cat) => (
                        <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 group hover:bg-muted/40 transition-colors">
                          {editingCategory?.original === cat ? (
                            <div className="flex flex-1 gap-2 items-center">
                              <Input 
                                value={editingCategory.current}
                                onChange={(e) => setEditingCategory({ ...editingCategory, current: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && updateCategoryName()}
                                className="h-8 rounded-lg bg-background border-none focus-visible:ring-1 focus-visible:ring-yellow-400 py-1"
                              />
                              <Button variant="ghost" size="icon" onClick={updateCategoryName} className="h-8 w-8 rounded-lg hover:bg-green-500/20 hover:text-green-600">
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{cat}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => setEditingCategory({ original: cat, current: cat })} className="h-8 w-8 rounded-lg hover:bg-blue-500/20 hover:text-blue-600">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => deleteCategory(cat)} 
                                  disabled={categories.length <= 1}
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/20 hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Backup Section */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
                    <h3 className="text-sm font-semibold opacity-50 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Backup & Restore
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        onClick={exportData}
                        className="rounded-xl border-none bg-muted/20 hover:bg-muted/40 h-14 flex flex-col gap-1 items-center justify-center pt-2"
                      >
                        <Download className="h-4 w-4 text-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Export JSON</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border-none bg-muted/20 hover:bg-muted/40 h-14 flex flex-col gap-1 items-center justify-center pt-2"
                      >
                        <Upload className="h-4 w-4 text-green-500" />
                        <span className="text-[10px] font-bold uppercase tracking-tight">Import JSON</span>
                      </Button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={importData} 
                        accept=".json" 
                        className="hidden" 
                      />
                    </div>
                    <p className="text-[10px] text-center opacity-40 leading-relaxed px-4 text-pretty">
                      Move your sticky notes to another browser by exporting and importing the backup file.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex w-full lg:w-auto flex-1 gap-3 items-center">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Type your new memo here..."
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMemo()}
                className="h-14 flex-1 rounded-2xl bg-muted/30 border-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:bg-muted/10 text-lg"
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-14 px-6 rounded-2xl bg-muted/20 border-none flex gap-2 font-semibold min-w-[120px]">
                    <Tags className="h-4 w-4" />
                    {selectedCategory}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl p-2 min-w-[140px] border-border/50 backdrop-blur-xl">
                  <DropdownMenuLabel className="flex items-center gap-2 text-xs opacity-50">
                    <Tags className="h-3 w-3" />
                    Choose Category
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {categories.map((cat) => (
                    <DropdownMenuItem 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "rounded-xl cursor-pointer p-3 font-medium transition-colors mb-1",
                        selectedCategory === cat ? "bg-yellow-400 text-neutral-900" : "hover:bg-muted/50"
                      )}
                    >
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              onClick={addMemo}
              size="lg"
              className="h-14 px-8 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-neutral-900 font-bold shadow-xl shadow-yellow-400/20 dark:shadow-yellow-900/10 transition-all hover:scale-105 active:scale-95 flex gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Add Memo
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Memos */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="memos" direction="horizontal" type="memo">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-center items-start pt-8 min-h-[500px]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredMemos.length > 0 ? (
                  filteredMemos.map((memo, index) => (
                    <Draggable key={memo.id} draggableId={memo.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="w-fit mx-auto"
                          style={{
                            ...provided.draggableProps.style,
                            zIndex: snapshot.isDragging ? 100 : 1
                          }}
                        >
                          <PostIt
                            content={memo.content}
                            rotate={memo.rotate}
                            color={memo.color}
                            timestamp={memo.timestamp}
                            category={memo.category}
                            onDelete={() => deleteMemo(memo.id)}
                            onUpdate={(newContent) => updateMemo(memo.id, newContent)}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="col-span-full h-full flex flex-col items-center justify-center text-center p-12 gap-4"
                  >
                    <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center animate-bounce">
                      <PlusCircle className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <p className="text-2xl font-semibold text-muted-foreground/60 max-w-xs">
                      {search ? "No memos matching your search." : "No memos yet. Add your first note above!"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
