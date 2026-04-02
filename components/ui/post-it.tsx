"use client";

import { motion } from "framer-motion";
import { X, Pencil, Check, Tags } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PostItProps {
  content: string;
  onDelete?: () => void;
  onUpdate?: (newContent: string) => void;
  className?: string;
  rotate?: number;
  color?: string;
  timestamp?: number;
  isDragging?: boolean;
  category?: string;
}

const formatDate = (ts?: number) => {
  if (!ts) return "";
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = dayNames[date.getDay()];
  
  return `${year}.${month}.${day} ${hours}:${minutes} ${dayName}요일`;
};

export function PostIt({ content, onDelete, onUpdate, className, rotate = 0, color = "#fef08a", timestamp, isDragging, category }: PostItProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    }
  }, [isEditing]);

  const handleUpdate = () => {
    if (editContent.trim()) {
      onUpdate?.(editContent);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ 
        scale: 2.5, 
        opacity: 0, 
        rotate: rotate + 25,
        y: -200,
        filter: "blur(8px)"
      }}
      animate={{ 
        scale: isDragging ? 1.05 : 1, 
        opacity: 1, 
        rotate: isDragging ? 0 : rotate,
        y: 0,
        filter: "blur(0px)",
        boxShadow: isDragging ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "none"
      }}
      whileHover={{ 
        scale: 1.05, 
        rotate: isEditing ? 0 : 0, 
        zIndex: 50,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        y: -5
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 30, 
        mass: 1.2 
      }}
      className={cn("relative group w-fit mx-auto", className, isDragging && "z-50")}
    >
      <Card 
        style={{ backgroundColor: color }}
        className={cn(
          "w-64 h-64 border-none shadow-xl shadow-black/10 dark:shadow-black/30 overflow-visible relative transition-colors",
          isDragging && "shadow-2xl ring-2 ring-black/5"
        )}
      >
        {/* Subtle Grain/Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/p6.png')]" />

        {/* Sticky top part - Drag Handle Area */}
        <div className="absolute top-0 left-0 w-full h-8 bg-black/5 dark:bg-black/10 transition-opacity group-hover:opacity-0 cursor-grab active:cursor-grabbing flex items-center px-4">
          {category && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-800/40 dark:text-neutral-900/40 flex items-center gap-1">
              <Tags className="h-3 w-3" />
              {category}
            </div>
          )}
        </div>
        
        {/* Buttons Container */}
        <div className="absolute -top-3 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-20 px-2 translate-y-2 group-hover:translate-y-0">
          {!isEditing ? (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setIsEditing(true)}
              className="h-9 w-9 rounded-xl bg-white/90 dark:bg-black/90 shadow-lg hover:bg-yellow-400 hover:text-neutral-900 border-none backdrop-blur-sm"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleUpdate}
              className="h-9 w-9 rounded-xl bg-green-500 text-white shadow-lg hover:bg-green-600 border-none backdrop-blur-sm"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            onClick={onDelete}
            className="h-9 w-9 rounded-xl bg-white/90 dark:bg-black/90 shadow-lg hover:bg-destructive hover:text-destructive-foreground border-none backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-8 h-full flex items-center justify-center text-center relative z-10">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleUpdate();
                }
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditContent(content);
                }
              }}
              className="w-full h-40 bg-transparent border-none focus:ring-0 text-xl font-serif text-neutral-900 dark:text-neutral-950 text-center resize-none p-0 overflow-hidden outline-none selection:bg-black/10"
            />
          ) : (
            <p className="font-serif text-xl text-neutral-800 dark:text-neutral-900 leading-relaxed break-words whitespace-pre-wrap decoration-neutral-800/20">
              {content}
            </p>
          )}
        </CardContent>

        {/* Date/Time Stamp */}
        <div className="absolute bottom-3 left-4 text-[10px] font-medium text-neutral-800/30 dark:text-neutral-900/30 pointer-events-none select-none z-10">
          {formatDate(timestamp)}
        </div>

        {/* Paper Fold Effect */}
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-black/5 dark:bg-black/10 rounded-tl-xl transition-all group-hover:w-10 group-hover:h-10" />
      </Card>
    </motion.div>
  );
}
