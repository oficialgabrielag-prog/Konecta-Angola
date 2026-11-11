import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Bookmark,
  Sun,
  Moon,
  Type,
  Maximize2,
  Minimize2,
  Clock,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Check,
  Star,
  Share2,
  Download,
  ExternalLink,
  Sparkles,
  Sliders,
  AlignLeft,
  BookMarked
} from 'lucide-react';

export interface OnlineBookReaderProps {
  book: any;
  chapters: any[];
  initialChapterId?: string;
  initialMode?: 'chapters' | 'pdf';
  onClose: () => void;
  onOpenReviews?: () => void;
  onShare?: (book: any) => void;
  user?: any;
}

type ReaderTheme = 'light' | 'sepia' | 'dark';
type FontFamily = 'serif' | 'sans' | 'mono';
type FontSize = 'sm' | 'base' | 'lg' | 'xl' | '2xl';
type LineHeight = 'relaxed' | 'loose' | 'spacious';
type ColumnWidth = 'normal' | 'wide' | 'max';

interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: FontFamily;
  fontSize: FontSize;
  lineHeight: LineHeight;
  columnWidth: ColumnWidth;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontFamily: 'serif',
  fontSize: 'lg',
  lineHeight: 'relaxed',
  columnWidth: 'normal'
};

export const OnlineBookReader: React.FC<OnlineBookReaderProps> = ({
  book,
  chapters = [],
  initialChapterId,
  initialMode,
  onClose,
  onOpenReviews,
  onShare,
  user
}) => {
  // Determine available modes
  const hasChapters = chapters && chapters.length > 0;
  const hasPdf = Boolean(book?.pdf_url);

  // Active mode: chapters vs pdf
  const [activeMode, setActiveMode] = useState<'chapters' | 'pdf'>(() => {
    if (initialMode === 'pdf' && hasPdf) return 'pdf';
    if (initialMode === 'chapters' && hasChapters) return 'chapters';
    return hasChapters ? 'chapters' : hasPdf ? 'pdf' : 'chapters';
  });

  // Current active chapter
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(() => {
    if (!hasChapters) return 0;
    if (initialChapterId) {
      const idx = chapters.findIndex((c: any) => c.id === initialChapterId);
      if (idx !== -1) return idx;
    }
    // Check saved progress in localStorage
    try {
      const saved = localStorage.getItem(`konecta_reader_progress_${book?.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedIdx = chapters.findIndex((c: any) => c.id === parsed.chapterId);
        if (savedIdx !== -1) return savedIdx;
      }
    } catch {
      // Ignore parse error
    }
    return 0;
  });

  // Reader Appearance Settings
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const saved = localStorage.getItem('konecta_reader_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // Ignore parse error
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings when changed
  const updateSettings = (partial: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem('konecta_reader_settings', JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      return updated;
    });
  };

  // UI Panels state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0); // 0 to 100%
  const [chapterProgress, setChapterProgress] = useState(0); // 0 to 100% within current chapter

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`konecta_bookmarks_${book?.id}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  // Speech / Audio Narration state (Web Speech API)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Zoom for PDF
  const [pdfZoom, setPdfZoom] = useState<'fit' | '100' | '125' | '150'>('fit');

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentChapter = chapters[currentChapterIndex] || null;

  // Check speech synthesis support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Save reading progress to localStorage
  useEffect(() => {
    if (!book?.id || !currentChapter) return;
    try {
      const progressData = {
        chapterId: currentChapter.id,
        chapterNumber: currentChapter.chapter_number || currentChapterIndex + 1,
        chapterTitle: currentChapter.title,
        scrollPercent: chapterProgress,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`konecta_reader_progress_${book.id}`, JSON.stringify(progressData));
    } catch {
      // Ignore
    }
  }, [book?.id, currentChapter, chapterProgress, currentChapterIndex]);

  // Reset scroll and speech when changing chapter
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (isSpeaking && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    }
  }, [currentChapterIndex]);

  // Track scroll progress within content container
  const handleScroll = () => {
    if (!contentContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentContainerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const currentProgress = maxScroll > 0 ? Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100)) : 0;
    setChapterProgress(Math.round(currentProgress));

    if (chapters.length > 0) {
      const overall = ((currentChapterIndex + currentProgress / 100) / chapters.length) * 100;
      setReadingProgress(Math.round(overall));
    }
  };

  // Estimated reading time for current chapter
  const estimatedReadingTime = useMemo(() => {
    if (!currentChapter?.content) return 1;
    const words = currentChapter.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200)); // Average 200 wpm
  }, [currentChapter]);

  // Total book word count and estimated time
  const totalBookStats = useMemo(() => {
    if (!chapters || chapters.length === 0) return { words: 0, minutes: 0 };
    const words = chapters.reduce((acc: number, ch: any) => acc + (ch.content?.trim().split(/\s+/).length || 0), 0);
    return {
      words,
      minutes: Math.max(1, Math.ceil(words / 200))
    };
  }, [chapters]);

  // Toggle fullscreen mode
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fallback
      setIsFullscreen(!isFullscreen);
    }
  };

  // Keyboard navigation (ArrowLeft: Previous, ArrowRight: Next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentChapterIndex < chapters.length - 1) {
          setCurrentChapterIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentChapterIndex > 0) {
          setCurrentChapterIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        if (isTocOpen) setIsTocOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, chapters.length, isTocOpen, isSettingsOpen]);

  // Speech narration handler
  const handleToggleSpeech = () => {
    if (!speechSupported || !currentChapter?.content) return;

    if (isSpeaking) {
      if (isSpeechPaused) {
        window.speechSynthesis.resume();
        setIsSpeechPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsSpeechPaused(true);
      }
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown/special characters for speech
    const cleanText = `${currentChapter.title}. ${currentChapter.content.replace(/[#*`_~]/g, '')}`;
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Prefer Portuguese voices if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang.startsWith('pt')) || null;
    if (ptVoice) {
      utterance.voice = ptVoice;
      utterance.lang = ptVoice.lang;
    } else {
      utterance.lang = 'pt-PT';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsSpeechPaused(false);
  };

  const handleStopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    }
  };

  // Toggle Bookmark for current chapter
  const handleToggleBookmark = () => {
    if (!currentChapter) return;
    const exists = bookmarks.some((b) => b.chapterId === currentChapter.id);
    let updated;
    if (exists) {
      updated = bookmarks.filter((b) => b.chapterId !== currentChapter.id);
    } else {
      updated = [
        ...bookmarks,
        {
          id: crypto.randomUUID(),
          chapterId: currentChapter.id,
          chapterNumber: currentChapter.chapter_number || currentChapterIndex + 1,
          chapterTitle: currentChapter.title,
          excerpt: currentChapter.content?.slice(0, 120) + '...',
          created_at: new Date().toISOString()
        }
      ];
    }
    setBookmarks(updated);
    try {
      localStorage.setItem(`konecta_bookmarks_${book?.id}`, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const isCurrentChapterBookmarked = bookmarks.some((b) => b.chapterId === currentChapter?.id);

  // Theme style mappings
  const themeClasses = {
    light: {
      bg: 'bg-white',
      pageBg: 'bg-slate-50',
      text: 'text-slate-800',
      heading: 'text-slate-900',
      muted: 'text-slate-500',
      border: 'border-slate-200',
      headerBg: 'bg-white/95 border-slate-200/80',
      cardBg: 'bg-slate-50 border-slate-200',
      activeItem: 'bg-slate-100 text-slate-900',
      button: 'hover:bg-slate-100 text-slate-700'
    },
    sepia: {
      bg: 'bg-[#F9F3E5]',
      pageBg: 'bg-[#EFE6D3]',
      text: 'text-[#3E3224]',
      heading: 'text-[#2D2317]',
      muted: 'text-[#7D6B58]',
      border: 'border-[#E2D6C0]',
      headerBg: 'bg-[#F9F3E5]/95 border-[#E2D6C0]',
      cardBg: 'bg-[#F2E8D4] border-[#E2D6C0]',
      activeItem: 'bg-[#EADDC6] text-[#2D2317]',
      button: 'hover:bg-[#EADDC6] text-[#4D3E2E]'
    },
    dark: {
      bg: 'bg-[#0E1626]',
      pageBg: 'bg-[#080D18]',
      text: 'text-[#DDE4EE]',
      heading: 'text-white',
      muted: 'text-slate-400',
      border: 'border-slate-800',
      headerBg: 'bg-[#0E1626]/95 border-slate-800',
      cardBg: 'bg-[#152138] border-slate-800',
      activeItem: 'bg-[#1F2F4E] text-white',
      button: 'hover:bg-slate-800 text-slate-300'
    }
  }[settings.theme];

  // Font Family mappings
  const fontFamilyClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono'
  }[settings.fontFamily];

  // Font Size mappings
  const fontSizeClass = {
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
    '2xl': 'text-2xl sm:text-3xl'
  }[settings.fontSize];

  // Line Height mappings
  const lineHeightClass = {
    relaxed: 'leading-relaxed',
    loose: 'leading-loose',
    spacious: 'leading-[2.2]'
  }[settings.lineHeight];

  // Column Width mappings
  const columnWidthClass = {
    normal: 'max-w-2xl',
    wide: 'max-w-3xl',
    max: 'max-w-4xl'
  }[settings.columnWidth];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300 overflow-hidden select-text`}
    >
      {/* ======================================================== */}
      {/* SLIM TOP PROGRESS BAR */}
      {/* ======================================================== */}
      <div className="w-full h-1 bg-black/10 shrink-0 relative overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-konecta-gold to-amber-500 transition-all duration-300"
          style={{ width: `${activeMode === 'chapters' ? readingProgress : 100}%` }}
        />
      </div>

      {/* ======================================================== */}
      {/* HEADER TOOLBAR */}
      {/* ======================================================== */}
      <header
        className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 backdrop-blur-md shrink-0 ${themeClasses.headerBg} transition-colors z-20`}
      >
        {/* Left: Exit & Book Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border border-transparent transition-colors cursor-pointer shrink-0 ${themeClasses.button}`}
            title="Sair do Leitor (Voltar à Biblioteca)"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-konecta-gold truncate">
                {book?.genre || 'Literatura'}
              </span>
              <span className="text-gray-400 text-xs hidden sm:inline">•</span>
              <span className={`text-[11px] truncate hidden sm:inline ${themeClasses.muted}`}>
                {book?.profiles?.full_name || 'Autor'}
              </span>
            </div>
            <h1 className={`text-xs sm:text-sm font-black truncate ${themeClasses.heading}`}>
              {book?.title}
            </h1>
          </div>
        </div>

        {/* Center: Mode Switcher (if both chapters and PDF exist) */}
        {hasChapters && hasPdf && (
          <div className={`hidden md:flex items-center p-1 rounded-xl border ${themeClasses.border} bg-black/5`}>
            <button
              onClick={() => setActiveMode('chapters')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'chapters'
                  ? 'bg-konecta-navy text-white shadow-sm'
                  : `${themeClasses.muted} hover:text-konecta-navy`
              }`}
            >
              <BookOpen size={13} />
              <span>Capítulos ({chapters.length})</span>
            </button>
            <button
              onClick={() => setActiveMode('pdf')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'pdf'
                  ? 'bg-konecta-navy text-white shadow-sm'
                  : `${themeClasses.muted} hover:text-konecta-navy`
              }`}
            >
              <FileText size={13} />
              <span>PDF Original</span>
            </button>
          </div>
        )}

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mode toggle button for mobile if both available */}
          {hasChapters && hasPdf && (
            <button
              onClick={() => setActiveMode(activeMode === 'chapters' ? 'pdf' : 'chapters')}
              className={`p-2 rounded-xl md:hidden text-xs font-bold ${themeClasses.button} cursor-pointer`}
              title="Alternar entre Capítulos e PDF"
            >
              {activeMode === 'chapters' ? <FileText size={18} /> : <BookOpen size={18} />}
            </button>
          )}

          {/* Table of Contents Button (Chapters Mode only) */}
          {activeMode === 'chapters' && hasChapters && (
            <button
              onClick={() => setIsTocOpen(true)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTocOpen ? themeClasses.activeItem : themeClasses.button
              }`}
              title="Índice / Capítulos"
            >
              <List size={18} />
              <span className="hidden sm:inline">Índice</span>
            </button>
          )}

          {/* Audio Narration Toggle (Chapters Mode only) */}
          {activeMode === 'chapters' && speechSupported && currentChapter?.content && (
            <div className="flex items-center">
              <button
                onClick={handleToggleSpeech}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isSpeaking ? 'bg-konecta-gold text-konecta-navy shadow-sm' : themeClasses.button
                }`}
                title={isSpeaking ? (isSpeechPaused ? 'Retomar Narração' : 'Pausar Narração') : 'Ouvir Capítulo em Voz Alta'}
              >
                {isSpeaking ? (
                  isSpeechPaused ? <Play size={18} /> : <Pause size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
              </button>
              {isSpeaking && (
                <button
                  onClick={handleStopSpeech}
                  className={`p-2 rounded-xl ${themeClasses.button} text-red-500 cursor-pointer`}
                  title="Parar Narração"
                >
                  <VolumeX size={16} />
                </button>
              )}
            </div>
          )}

          {/* Bookmark Toggle (Chapters Mode only) */}
          {activeMode === 'chapters' && hasChapters && (
            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isCurrentChapterBookmarked
                  ? 'text-konecta-gold fill-konecta-gold bg-konecta-gold/10'
                  : themeClasses.button
              }`}
              title={isCurrentChapterBookmarked ? 'Marcador guardado' : 'Guardar marcador de leitura'}
            >
              <Bookmark size={18} fill={isCurrentChapterBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}

          {/* Appearance Settings Menu (Chapters Mode only) */}
          {activeMode === 'chapters' && (
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isSettingsOpen ? themeClasses.activeItem : themeClasses.button
                }`}
                title="Ajustar Tipografia e Tema"
              >
                <Sliders size={18} />
              </button>

              {/* Settings Dropdown Popover */}
              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-5 rounded-2xl shadow-2xl border z-30 space-y-4 ${themeClasses.cardBg}`}
                  >
                    <div className="flex items-center justify-between border-b pb-2 border-inherit">
                      <div className="flex items-center gap-2">
                        <Type size={16} className="text-konecta-gold" />
                        <span className={`text-xs font-bold uppercase tracking-wider ${themeClasses.heading}`}>
                          Preferências de Leitura
                        </span>
                      </div>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className={`text-xs ${themeClasses.muted} hover:text-red-500 cursor-pointer`}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Theme Selector */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold block ${themeClasses.muted}`}>Tema de Fundo</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateSettings({ theme: 'light' })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            settings.theme === 'light'
                              ? 'border-konecta-navy bg-white text-slate-900 shadow-sm'
                              : 'border-gray-200 bg-white/70 text-gray-700 hover:bg-white'
                          }`}
                        >
                          <Sun size={14} />
                          <span>Claro</span>
                        </button>

                        <button
                          onClick={() => updateSettings({ theme: 'sepia' })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            settings.theme === 'sepia'
                              ? 'border-[#7D6B58] bg-[#F9F3E5] text-[#3E3224] shadow-sm ring-2 ring-amber-500/30'
                              : 'border-[#E2D6C0] bg-[#F9F3E5]/70 text-[#5D4E3C] hover:bg-[#F9F3E5]'
                          }`}
                        >
                          <BookOpen size={14} />
                          <span>Sépia</span>
                        </button>

                        <button
                          onClick={() => updateSettings({ theme: 'dark' })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            settings.theme === 'dark'
                              ? 'border-konecta-gold bg-[#0E1626] text-white shadow-sm ring-2 ring-konecta-gold/30'
                              : 'border-slate-700 bg-[#0E1626]/70 text-slate-300 hover:bg-[#0E1626]'
                          }`}
                        >
                          <Moon size={14} />
                          <span>Noturno</span>
                        </button>
                      </div>
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold block ${themeClasses.muted}`}>Tipografia</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateSettings({ fontFamily: 'serif' })}
                          className={`py-2 px-2 rounded-xl text-xs font-serif font-bold border transition-all cursor-pointer ${
                            settings.fontFamily === 'serif'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Serifada
                        </button>
                        <button
                          onClick={() => updateSettings({ fontFamily: 'sans' })}
                          className={`py-2 px-2 rounded-xl text-xs font-sans font-bold border transition-all cursor-pointer ${
                            settings.fontFamily === 'sans'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Moderna
                        </button>
                        <button
                          onClick={() => updateSettings({ fontFamily: 'mono' })}
                          className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                            settings.fontFamily === 'mono'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Mono
                        </button>
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold block ${themeClasses.muted}`}>Tamanho da Letra</span>
                      <div className="flex items-center justify-between gap-1 p-1 rounded-xl border border-inherit">
                        {(['sm', 'base', 'lg', 'xl', '2xl'] as FontSize[]).map((sz, idx) => (
                          <button
                            key={sz}
                            onClick={() => updateSettings({ fontSize: sz })}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              settings.fontSize === sz
                                ? 'bg-konecta-navy text-white shadow-sm'
                                : 'hover:bg-black/5'
                            }`}
                          >
                            {idx === 0 ? 'A-' : idx === 4 ? 'A+' : `A${idx > 1 ? '+' : ''}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Line Spacing */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold block ${themeClasses.muted}`}>Espaçamento entre Linhas</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateSettings({ lineHeight: 'relaxed' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.lineHeight === 'relaxed'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Normal
                        </button>
                        <button
                          onClick={() => updateSettings({ lineHeight: 'loose' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.lineHeight === 'loose'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Confortável
                        </button>
                        <button
                          onClick={() => updateSettings({ lineHeight: 'spacious' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.lineHeight === 'spacious'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Amplo
                        </button>
                      </div>
                    </div>

                    {/* Column Width */}
                    <div className="space-y-1.5">
                      <span className={`text-[11px] font-bold block ${themeClasses.muted}`}>Largura da Página</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => updateSettings({ columnWidth: 'normal' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.columnWidth === 'normal'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Clássica
                        </button>
                        <button
                          onClick={() => updateSettings({ columnWidth: 'wide' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.columnWidth === 'wide'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Larga
                        </button>
                        <button
                          onClick={() => updateSettings({ columnWidth: 'max' })}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            settings.columnWidth === 'max'
                              ? 'bg-konecta-navy text-white border-konecta-navy shadow-sm'
                              : 'border-inherit hover:bg-black/5'
                          }`}
                        >
                          Máxima
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl hidden sm:inline-flex ${themeClasses.button} cursor-pointer`}
            title={isFullscreen ? 'Sair do Modo Ecrã Completo' : 'Ecrã Completo'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Close Reader */}
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${themeClasses.button} hover:text-red-500 cursor-pointer`}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MAIN READER BODY */}
      {/* ======================================================== */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* ======================================================== */}
        {/* TABLE OF CONTENTS DRAWER / SIDE SHEET */}
        {/* ======================================================== */}
        <AnimatePresence>
          {isTocOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTocOpen(false)}
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs"
              />

              {/* Drawer Content */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className={`fixed inset-y-0 left-0 z-40 w-full max-w-sm sm:max-w-md ${themeClasses.bg} border-r ${themeClasses.border} shadow-2xl flex flex-col`}
              >
                {/* Drawer Header */}
                <div className={`p-5 border-b ${themeClasses.border} flex items-center justify-between shrink-0`}>
                  <div className="flex items-center gap-2">
                    <List size={18} className="text-konecta-gold" />
                    <h3 className={`text-sm font-bold uppercase tracking-wider ${themeClasses.heading}`}>
                      Índice da Obra ({chapters.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsTocOpen(false)}
                    className={`p-2 rounded-xl ${themeClasses.button} cursor-pointer`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Book Mini Card */}
                <div className={`p-4 border-b ${themeClasses.border} flex items-center gap-3 bg-black/5`}>
                  {book?.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-12 h-16 object-cover rounded-lg shadow-sm border border-black/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-16 rounded-lg bg-konecta-navy text-konecta-gold flex items-center justify-center shrink-0">
                      <BookOpen size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className={`text-xs font-bold line-clamp-1 ${themeClasses.heading}`}>
                      {book?.title}
                    </h4>
                    <p className={`text-[11px] ${themeClasses.muted} truncate`}>
                      Por {book?.profiles?.full_name || 'Autor'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                      <Clock size={11} />
                      <span>~{totalBookStats.minutes} min de leitura total</span>
                    </div>
                  </div>
                </div>

                {/* Chapters & Bookmarks Tabs */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <div className="space-y-1">
                    {chapters.map((ch: any, idx: number) => {
                      const isCurrent = idx === currentChapterIndex;
                      const words = ch.content?.trim().split(/\s+/).length || 0;
                      const time = Math.max(1, Math.ceil(words / 200));

                      return (
                        <button
                          key={ch.id || idx}
                          onClick={() => {
                            setCurrentChapterIndex(idx);
                            setIsTocOpen(false);
                          }}
                          className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isCurrent
                              ? `${themeClasses.activeItem} shadow-sm border border-konecta-gold/40`
                              : `${themeClasses.button} border border-transparent`
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                isCurrent
                                  ? 'bg-konecta-gold text-konecta-navy'
                                  : 'bg-black/5 text-gray-500'
                              }`}
                            >
                              {ch.chapter_number || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h5 className={`text-xs font-bold truncate ${isCurrent ? 'text-konecta-gold' : ''}`}>
                                {ch.title}
                              </h5>
                              <p className={`text-[10px] ${themeClasses.muted}`}>
                                ~{time} min de leitura · {words} palavras
                              </p>
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="text-[10px] font-black text-konecta-gold bg-konecta-gold/15 px-2 py-0.5 rounded-full shrink-0">
                              A Ler
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Bookmarks Section in Drawer */}
                  {bookmarks.length > 0 && (
                    <div className="pt-4 border-t border-inherit space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-konecta-gold">
                        <Bookmark size={13} fill="currentColor" />
                        <span>Marcadores Guardados ({bookmarks.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {bookmarks.map((bm: any) => (
                          <button
                            key={bm.id}
                            onClick={() => {
                              const targetIdx = chapters.findIndex((c: any) => c.id === bm.chapterId);
                              if (targetIdx !== -1) {
                                setCurrentChapterIndex(targetIdx);
                                setIsTocOpen(false);
                              }
                            }}
                            className={`w-full p-2.5 rounded-xl text-left text-xs ${themeClasses.cardBg} hover:border-konecta-gold transition-colors cursor-pointer space-y-1`}
                          >
                            <span className="font-bold block truncate text-konecta-navy">
                              Capítulo {bm.chapterNumber}: {bm.chapterTitle}
                            </span>
                            {bm.excerpt && (
                              <p className={`text-[10px] italic line-clamp-2 ${themeClasses.muted}`}>
                                "{bm.excerpt}"
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className={`p-4 border-t ${themeClasses.border} text-center text-[11px] ${themeClasses.muted}`}>
                  KONECTA Leitor Digital Angola
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* MODE A: CHAPTERS TEXT READER */}
        {/* ======================================================== */}
        {activeMode === 'chapters' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {hasChapters && currentChapter ? (
              <div
                ref={contentContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-16 scroll-smooth"
              >
                <div className={`mx-auto ${columnWidthClass} space-y-8`}>
                  {/* Chapter Header */}
                  <header className="border-b border-inherit pb-6 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-konecta-gold uppercase tracking-wider">
                      <span>Capítulo {currentChapter.chapter_number || currentChapterIndex + 1} de {chapters.length}</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-normal normal-case">
                        <Clock size={12} />
                        <span>~{estimatedReadingTime} min de leitura</span>
                      </div>
                    </div>
                    <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${themeClasses.heading}`}>
                      {currentChapter.title}
                    </h2>
                  </header>

                  {/* Chapter Content Typography Canvas */}
                  <article
                    className={`${fontFamilyClass} ${fontSizeClass} ${lineHeightClass} whitespace-pre-wrap leading-relaxed select-text tracking-normal text-justify`}
                  >
                    {currentChapter.content}
                  </article>

                  {/* End of Chapter Navigation & Completion */}
                  <div className="pt-12 border-t border-inherit space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      {/* Previous Chapter Button */}
                      {currentChapterIndex > 0 ? (
                        <button
                          onClick={() => setCurrentChapterIndex((prev) => prev - 1)}
                          className={`px-4 py-3 rounded-2xl border ${themeClasses.border} ${themeClasses.button} flex items-center gap-2 cursor-pointer`}
                        >
                          <ChevronLeft size={18} />
                          <div className="text-left">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">Anterior</span>
                            <span className="text-xs font-bold line-clamp-1 max-w-[140px] sm:max-w-[200px]">
                              {chapters[currentChapterIndex - 1]?.title}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div />
                      )}

                      {/* Next Chapter Button */}
                      {currentChapterIndex < chapters.length - 1 ? (
                        <button
                          onClick={() => setCurrentChapterIndex((prev) => prev + 1)}
                          className="px-5 py-3 rounded-2xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ml-auto"
                        >
                          <div className="text-right">
                            <span className="text-[10px] text-white/70 block uppercase">Seguinte</span>
                            <span className="text-xs font-bold line-clamp-1 max-w-[140px] sm:max-w-[200px]">
                              {chapters[currentChapterIndex + 1]?.title}
                            </span>
                          </div>
                          <ChevronRight size={18} />
                        </button>
                      ) : (
                        /* Book Completed Celebration Card */
                        <div className="w-full p-6 rounded-3xl bg-gradient-to-br from-konecta-navy to-slate-900 text-white text-center space-y-4 shadow-xl border border-white/10">
                          <div className="w-12 h-12 rounded-full bg-konecta-gold/20 text-konecta-gold flex items-center justify-center mx-auto">
                            <Sparkles size={24} />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg sm:text-xl font-extrabold text-white">
                              Parabéns! Concluíste a leitura desta obra!
                            </h3>
                            <p className="text-xs text-gray-300 max-w-md mx-auto">
                              Chegaste ao fim de "{book?.title}". O autor e a comunidade KONECTA adorariam conhecer a tua opinião sincera.
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                            {onOpenReviews && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onOpenReviews();
                                }}
                                className="px-5 py-2.5 rounded-xl bg-konecta-gold text-konecta-navy font-bold text-xs hover:bg-white transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                              >
                                <Star size={14} fill="currentColor" />
                                <span>Avaliar esta Obra</span>
                              </button>
                            )}

                            {onShare && (
                              <button
                                onClick={() => onShare(book)}
                                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
                              >
                                <Share2 size={14} />
                                <span>Partilhar</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setCurrentChapterIndex(0);
                                if (contentContainerRef.current) {
                                  contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className="px-4 py-2.5 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 font-medium text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <RotateCcw size={14} />
                              <span>Reler do Início</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No Chapters Available State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center text-gray-400">
                  <BookOpen size={32} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className={`text-base font-bold ${themeClasses.heading}`}>
                    Esta obra ainda não possui capítulos de texto divididos.
                  </h3>
                  <p className={`text-xs ${themeClasses.muted}`}>
                    {hasPdf
                      ? 'O documento completo em PDF está disponível para leitura imediata.'
                      : 'O autor ainda está a preparar os capítulos desta obra literária.'}
                  </p>
                </div>
                {hasPdf && (
                  <button
                    onClick={() => setActiveMode('pdf')}
                    className="px-5 py-2.5 rounded-xl bg-konecta-navy text-white font-bold text-xs hover:bg-konecta-gold hover:text-konecta-navy transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <FileText size={16} />
                    <span>Ler em Formato PDF</span>
                  </button>
                )}
              </div>
            )}

            {/* Bottom Floating Navigation Bar (Mobile / Quick Jump) */}
            {hasChapters && (
              <footer
                className={`px-4 py-2.5 border-t ${themeClasses.border} backdrop-blur-md flex items-center justify-between gap-3 shrink-0 text-xs ${themeClasses.headerBg}`}
              >
                <button
                  disabled={currentChapterIndex === 0}
                  onClick={() => setCurrentChapterIndex((prev) => Math.max(0, prev - 1))}
                  className={`p-2 rounded-xl flex items-center gap-1 disabled:opacity-30 cursor-pointer ${themeClasses.button}`}
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className={themeClasses.muted}>
                    Capítulo {currentChapterIndex + 1} de {chapters.length}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-konecta-gold">
                    {chapterProgress}% lido
                  </span>
                </div>

                <button
                  disabled={currentChapterIndex >= chapters.length - 1}
                  onClick={() => setCurrentChapterIndex((prev) => Math.min(chapters.length - 1, prev + 1))}
                  className={`p-2 rounded-xl flex items-center gap-1 disabled:opacity-30 cursor-pointer ${themeClasses.button}`}
                >
                  <span className="hidden sm:inline">Seguinte</span>
                  <ChevronRight size={16} />
                </button>
              </footer>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODE B: INTEGRATED PDF ONLINE READER */}
        {/* ======================================================== */}
        {activeMode === 'pdf' && (
          <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden relative">
            {hasPdf ? (
              <>
                {/* PDF Toolbar */}
                <div className="px-4 py-2.5 bg-slate-800 text-white flex items-center justify-between gap-3 border-b border-slate-700 shrink-0 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-konecta-gold" />
                    <span className="font-bold truncate max-w-[200px] sm:max-w-md">
                      {book?.title} (Documento PDF)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={book.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                      title="Abrir em Nova Aba"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">Nova Aba</span>
                    </a>

                    <a
                      href={book.pdf_url}
                      download
                      className="px-3 py-1.5 rounded-lg bg-konecta-gold text-konecta-navy font-bold text-xs flex items-center gap-1.5 transition-colors hover:bg-white"
                      title="Descarregar Ficheiro PDF"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">Descarregar</span>
                    </a>
                  </div>
                </div>

                {/* PDF Frame */}
                <div className="flex-1 w-full h-full bg-slate-900 relative">
                  <iframe
                    src={`${book.pdf_url}#toolbar=1&navpanes=0`}
                    title={book?.title || 'Leitor PDF'}
                    className="w-full h-full border-none"
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white space-y-3">
                <FileText size={36} className="text-gray-500" />
                <h4 className="text-base font-bold">Documento PDF não disponível</h4>
                <p className="text-xs text-gray-400">
                  O autor ainda não enviou o ficheiro PDF desta obra literária.
                </p>
                {hasChapters && (
                  <button
                    onClick={() => setActiveMode('chapters')}
                    className="px-4 py-2 rounded-xl bg-konecta-gold text-konecta-navy font-bold text-xs"
                  >
                    Ler por Capítulos
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
