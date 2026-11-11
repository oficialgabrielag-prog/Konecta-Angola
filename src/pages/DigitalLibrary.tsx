import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { useUI } from '../context/UIContext';
import { useT } from '../context/LanguageContext';
import { GoogleDrivePickerModal, SelectedDocumentResult } from '../components/GoogleDrivePickerModal';
import { OnlineBookReader } from '../components/OnlineBookReader';
import {
  Book,
  BookOpen,
  FileText,
  Upload,
  Image as ImageIcon,
  Star,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
  Download,
  ExternalLink,
  MessageSquare,
  CornerDownRight,
  Sparkles,
  ShieldCheck,
  Eye,
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  FileCheck,
  RefreshCw,
  Send,
  ArrowLeft
} from 'lucide-react';

interface DigitalLibraryProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const { t } = useT();
  const { openShareSheet, createIntent, setCreateIntent, showToast } = useUI();

  // Books list state
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Book for Reading / Detail
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentChapter, setCurrentChapter] = useState<any | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);

  // Online Reading System State
  const [readingBook, setReadingBook] = useState<any | null>(null);
  const [readingChapters, setReadingChapters] = useState<any[]>([]);
  const [readingInitialChapterId, setReadingInitialChapterId] = useState<string | undefined>(undefined);
  const [readingInitialMode, setReadingInitialMode] = useState<'chapters' | 'pdf'>('chapters');

  // Review submission state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Author reply to review state
  const [replyingReviewerId, setReplyingReviewerId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Create Book Modal state
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('Literatura');
  const [language, setLanguage] = useState('Português');
  const [copyrightNotice, setCopyrightNotice] = useState('Todos os direitos reservados');

  // File uploads for new book
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileSize, setPdfFileSize] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [creating, setCreating] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveBookDoc, setDriveBookDoc] = useState<SelectedDocumentResult | null>(null);

  // File input refs for new book
  const coverInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Author asset upload states & refs for existing book
  const [uploadingBookCover, setUploadingBookCover] = useState(false);
  const [uploadingBookPdf, setUploadingBookPdf] = useState(false);
  const authorCoverInputRef = useRef<HTMLInputElement>(null);
  const authorPdfInputRef = useRef<HTMLInputElement>(null);

  // Add Chapter Modal state
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [savingChapter, setSavingChapter] = useState(false);

  const genres = [
    'Literatura',
    'Poesia',
    'Ensaio',
    'História de Angola',
    'Ficção',
    'Romance',
    'Desenvolvimento Pessoal',
    'Ciência e Tecnologia',
    'Crónica',
    'Conto'
  ];

  const languages = [
    'Português',
    'Inglês',
    'Francês',
    'Kimbundu',
    'Umbundu',
    'Cokwe',
    'Kikongo',
    'Outro'
  ];

  useEffect(() => {
    if (createIntent === 'book') {
      if (user) {
        setShowCreateBookModal(true);
      } else {
        onOpenAuth();
      }
      setCreateIntent(null);
    }
  }, [createIntent, user, setCreateIntent, onOpenAuth]);

  useEffect(() => {
    fetchBooks();
  }, [selectedGenre]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await d1Client.digitalLibrary.listBooks({ genre: selectedGenre });
      setBooks(res.data?.data || res.data || []);
    } catch (err) {
      console.warn('Erro ao carregar livros da biblioteca:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await d1Client.digitalLibrary.listBooks({ search: searchQuery });
      setBooks(res.data?.data || res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const openBookDetail = async (book: any) => {
    try {
      // Fetch fresh details with profiles and reviews
      const fresh = await d1Client.digitalLibrary.getBookById(book.id);
      const b = fresh.data || book;
      setSelectedBook(b);
      setChapters(b.book_chapters || []);
      setReviews(b.book_reviews || []);
      if (b.book_chapters?.length > 0) {
        setCurrentChapter(b.book_chapters[0]);
      } else {
        setCurrentChapter(null);
      }
    } catch (err) {
      setSelectedBook(book);
      setChapters(book.book_chapters || []);
      setReviews(book.book_reviews || []);
    }
  };

  const startOnlineReading = async (book: any, chapterId?: string, mode?: 'chapters' | 'pdf') => {
    try {
      let fullBook = book;
      let fullChapters = book.book_chapters || [];

      // If full chapters are not yet loaded with contents, fetch fresh book details
      if (!fullChapters || fullChapters.length === 0 || !fullChapters[0]?.content) {
        const fresh = await d1Client.digitalLibrary.getBookById(book.id);
        if (fresh?.data) {
          fullBook = fresh.data;
          fullChapters = fresh.data.book_chapters || [];
        }
      }

      setReadingBook(fullBook);
      setReadingChapters(fullChapters);
      setReadingInitialChapterId(chapterId || fullChapters[0]?.id);
      setReadingInitialMode(mode || (fullChapters.length > 0 ? 'chapters' : 'pdf'));
    } catch (err) {
      console.error('Erro ao iniciar leitor online:', err);
      setReadingBook(book);
      setReadingChapters(book.book_chapters || []);
      setReadingInitialChapterId(chapterId);
      setReadingInitialMode(mode || (book.pdf_url ? 'pdf' : 'chapters'));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Por favor seleciona uma imagem válida (JPG, PNG ou WEBP).', 'error');
      return;
    }

    setCoverFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Por favor seleciona um ficheiro PDF válido.', 'error');
      return;
    }

    setPdfFile(file);
    setPdfFileName(file.name);
    setPdfFileSize(formatFileSize(file.size));
  };

  const handleAuthorCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedBook) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Por favor seleciona uma imagem válida (JPG, PNG ou WEBP).', 'error');
      return;
    }

    setUploadingBookCover(true);
    try {
      const res = await d1Client.digitalLibrary.uploadBookAsset(
        user.id,
        selectedBook.id,
        file,
        'cover'
      );

      if (res.error) throw new Error(res.error.message || 'Falha no upload da capa.');

      if (res.url) {
        await d1Client.digitalLibrary.updateBook(selectedBook.id, {
          cover_url: res.url
        });

        // Update local state
        const updated = { ...selectedBook, cover_url: res.url };
        setSelectedBook(updated);

        // Update in books list
        setBooks((prev) =>
          prev.map((b) => (b.id === selectedBook.id ? { ...b, cover_url: res.url } : b))
        );

        showToast('Capa do livro atualizada com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar capa:', err);
      showToast(err.message || 'Erro ao carregar nova capa.', 'error');
    } finally {
      setUploadingBookCover(false);
      if (authorCoverInputRef.current) authorCoverInputRef.current.value = '';
    }
  };

  const handleAuthorPdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedBook) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Por favor seleciona um ficheiro PDF válido.', 'error');
      return;
    }

    setUploadingBookPdf(true);
    try {
      const res = await d1Client.digitalLibrary.uploadBookAsset(
        user.id,
        selectedBook.id,
        file,
        'pdf'
      );

      if (res.error) throw new Error(res.error.message || 'Falha no upload do PDF.');

      if (res.url) {
        await d1Client.digitalLibrary.updateBook(selectedBook.id, {
          pdf_url: res.url
        });

        // Update local state
        const updated = { ...selectedBook, pdf_url: res.url };
        setSelectedBook(updated);

        // Update in books list
        setBooks((prev) =>
          prev.map((b) => (b.id === selectedBook.id ? { ...b, pdf_url: res.url } : b))
        );

        showToast('Ficheiro PDF do livro carregado com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar PDF:', err);
      showToast(err.message || 'Erro ao carregar ficheiro PDF.', 'error');
    } finally {
      setUploadingBookPdf(false);
      if (authorPdfInputRef.current) authorPdfInputRef.current.value = '';
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!title.trim()) {
      showToast('O título do livro é obrigatório.', 'error');
      return;
    }

    if (!synopsis.trim()) {
      showToast('Por favor adiciona uma sinopse para apresentar a tua obra aos leitores.', 'error');
      return;
    }

    // Authors can upload cover, PDF, both, or write chapters online
    setCreating(true);
    setUploadProgress(10);

    try {
      const bookFolder = crypto.randomUUID();
      let finalCoverUrl = coverUrl;
      let finalPdfUrl = pdfUrl;

      // 1. Upload Cover to Supabase Storage if user selected a file
      if (coverFile) {
        setUploadProgress(25);
        const coverRes = await d1Client.digitalLibrary.uploadBookAsset(
          user.id,
          bookFolder,
          coverFile,
          'cover'
        );
        if (coverRes.error) {
          throw new Error('Falha no upload da capa para o Supabase Storage: ' + coverRes.error.message);
        }
        finalCoverUrl = coverRes.url || finalCoverUrl;
      } else if (driveBookDoc?.cloudinaryUrl && !finalCoverUrl) {
        finalCoverUrl = driveBookDoc.cloudinaryUrl;
      }

      // 2. Upload PDF to Supabase Storage if user selected a file
      if (pdfFile) {
        setUploadProgress(50);
        const pdfRes = await d1Client.digitalLibrary.uploadBookAsset(
          user.id,
          bookFolder,
          pdfFile,
          'pdf'
        );
        if (pdfRes.error) {
          throw new Error('Falha no upload do PDF para o Supabase Storage: ' + pdfRes.error.message);
        }
        finalPdfUrl = pdfRes.url || finalPdfUrl;
      } else if (driveBookDoc?.cloudinaryUrl && !finalPdfUrl) {
        finalPdfUrl = driveBookDoc.cloudinaryUrl;
      }

      setUploadProgress(85);

      // 3. Create Book in Supabase author_books table
      const res = await d1Client.digitalLibrary.createBook({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        synopsis: synopsis.trim() || undefined,
        genre,
        language,
        copyright_notice: copyrightNotice.trim() || 'Todos os direitos reservados',
        cover_url: finalCoverUrl || undefined,
        pdf_url: finalPdfUrl || undefined
      });

      if (res.error) throw new Error(res.error.message || 'Erro ao publicar obra literária.');

      setUploadProgress(100);
      setShowCreateBookModal(false);

      // Reset form
      setTitle('');
      setSubtitle('');
      setSynopsis('');
      setCoverFile(null);
      setCoverPreview(null);
      setCoverUrl('');
      setPdfFile(null);
      setPdfFileName('');
      setPdfFileSize('');
      setPdfUrl('');
      setDriveBookDoc(null);

      await fetchBooks();
      showToast('Obra literária publicada com sucesso no KONECTA!', 'success');

      if (res.data) {
        openBookDetail(res.data);
      }
    } catch (err: any) {
      console.error('Erro ao publicar obra:', err);
      showToast(err.message || 'Erro ao publicar obra.', 'error');
    } finally {
      setCreating(false);
      setUploadProgress(0);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim() || !chapterContent.trim() || savingChapter || !selectedBook) return;

    setSavingChapter(true);
    try {
      await d1Client.digitalLibrary.createChapter(selectedBook.id, {
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
        chapter_number: chapterNumber
      });

      setShowChapterModal(false);
      setChapterTitle('');
      setChapterContent('');
      setChapterNumber(chapters.length + 2);

      // Refresh book
      const fresh = await d1Client.digitalLibrary.getBookById(selectedBook.id);
      if (fresh.data) {
        setSelectedBook(fresh.data);
        setChapters(fresh.data.book_chapters || []);
        if (!currentChapter && fresh.data.book_chapters?.length > 0) {
          setCurrentChapter(fresh.data.book_chapters[0]);
        }
      }
      showToast('Capítulo adicionado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao adicionar capítulo:', err);
      showToast(err.message || 'Erro ao adicionar capítulo.', 'error');
    } finally {
      setSavingChapter(false);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!comment.trim() || submittingReview || !selectedBook) return;

    setSubmittingReview(true);
    try {
      await d1Client.digitalLibrary.addReview(selectedBook.id, rating, comment.trim());
      setComment('');
      // Refresh book with updated reviews from view
      const fresh = await d1Client.digitalLibrary.getBookById(selectedBook.id);
      if (fresh.data) {
        setSelectedBook(fresh.data);
        setReviews(fresh.data.book_reviews || []);
      }
      showToast('A tua avaliação foi registada com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao enviar avaliação:', err);
      showToast(err.message || 'Erro ao enviar avaliação.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveAuthorReply = async (reviewerId: string, replyId?: string) => {
    if (!user || !selectedBook || !replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const res = await d1Client.digitalLibrary.addReviewReply({
        bookId: selectedBook.id,
        reviewerId,
        reply: replyText.trim(),
        replyId
      });

      if (res.error) throw new Error(res.error.message || 'Erro ao guardar resposta');

      setReplyingReviewerId(null);
      setEditingReplyId(null);
      setReplyText('');

      // Refresh book details to show the updated author reply
      const fresh = await d1Client.digitalLibrary.getBookById(selectedBook.id);
      if (fresh.data) {
        setSelectedBook(fresh.data);
        setReviews(fresh.data.book_reviews || []);
      }
      showToast('Resposta do autor publicada com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao responder à avaliação:', err);
      showToast(err.message || 'Erro ao responder à avaliação.', 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Featured books for carousel
  const featuredBooks = books.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-10">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-konecta-navy via-[#0d2342] to-slate-900 text-white p-6 sm:p-10 shadow-xl border border-white/10">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-konecta-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-konecta-gold font-bold">
              <Sparkles size={14} />
              <span>Espaço Literário Oficial KONECTA Angola</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Biblioteca Digital para Escritores
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Publica as tuas obras literárias com capas e livros completos em PDF, lê capítulos online, avalia produções de autores angolanos e conversa diretamente com quem escreve.
            </p>
          </div>

          <button
            onClick={() => {
              if (!user) onOpenAuth();
              else setShowCreateBookModal(true);
            }}
            className="px-6 py-3.5 rounded-2xl bg-konecta-gold text-konecta-navy font-black text-xs uppercase tracking-wider hover:bg-white transition-all shadow-lg flex items-center justify-center gap-2.5 shrink-0 self-start md:self-auto cursor-pointer"
          >
            <BookOpen size={18} />
            <span>Publicar Nova Obra</span>
          </button>
        </div>
      </div>

      {/* Featured Works Showcase / Carousel */}
      {featuredBooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-konecta-gold animate-pulse" />
              <h2 className="text-base font-extrabold text-konecta-navy uppercase tracking-wider">
                Obras em Destaque
              </h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">Recomendadas para leitura</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredBooks.map((fBook) => (
              <div
                key={`feat-${fBook.id}`}
                onClick={() => openBookDetail(fBook)}
                className="group p-5 rounded-3xl bg-white border border-gray-200/80 hover:border-konecta-gold shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-5 items-center relative overflow-hidden"
              >
                {/* 3D Book Cover Style */}
                <div className="w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden bg-gradient-to-br from-konecta-navy to-slate-800 shrink-0 shadow-md border border-gray-100 relative group-hover:scale-105 transition-transform duration-300">
                  {fBook.cover_url ? (
                    <img src={fBook.cover_url} alt={fBook.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full p-2 flex flex-col justify-between text-white text-center">
                      <span className="text-[9px] uppercase font-bold text-konecta-gold">{fBook.genre}</span>
                      <Book size={24} className="mx-auto text-white/50" />
                      <span className="text-[10px] font-bold line-clamp-2">{fBook.title}</span>
                    </div>
                  )}
                  {/* Subtle spine highlight */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-white/20" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      {fBook.genre}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                      <Star size={13} fill="currentColor" />
                      <span>{fBook.average_rating || '5.0'}</span>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-konecta-navy line-clamp-1 group-hover:text-konecta-gold transition-colors">
                    {fBook.title}
                  </h3>

                  {fBook.subtitle && (
                    <p className="text-xs text-gray-500 line-clamp-1 italic">{fBook.subtitle}</p>
                  )}

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {fBook.synopsis || 'Sem sinopse disponível.'}
                  </p>

                  <div className="pt-2 flex items-center justify-between text-xs border-t border-gray-100">
                    <span className="text-gray-500 font-medium truncate max-w-[130px]">
                      Por <strong>{fBook.profiles?.full_name || 'Autor'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startOnlineReading(fBook);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="Iniciar leitura online"
                    >
                      <BookOpen size={13} />
                      <span>Ler Online</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genres & Search Filters */}
      <div className="space-y-4">
        {/* Genres Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedGenre === 'all'
                ? 'bg-konecta-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Todos os Géneros
          </button>
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedGenre === g
                  ? 'bg-konecta-navy text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, autor ou sinopse da obra..."
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-24 py-3.5 text-xs text-konecta-navy placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-konecta-navy/20 focus:border-konecta-navy"
          />
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Book size={18} />
          </span>
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-konecta-navy text-white text-xs font-bold hover:bg-konecta-gold hover:text-konecta-navy transition-colors cursor-pointer"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 size={36} className="animate-spin text-konecta-navy" />
          <p className="text-xs text-gray-500 font-medium">A carregar a biblioteca de autores...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-300">
            <Book size={32} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-konecta-navy">Nenhum livro encontrado</h3>
            <p className="text-xs text-gray-500">
              Sê o primeiro escritor a publicar uma obra nesta categoria e partilha o teu talento com Angola.
            </p>
          </div>
          <button
            onClick={() => user ? setShowCreateBookModal(true) : onOpenAuth()}
            className="px-6 py-2.5 rounded-xl bg-konecta-gold text-konecta-navy font-bold text-xs uppercase tracking-wider hover:bg-konecta-navy hover:text-white transition-colors cursor-pointer"
          >
            Publicar Primeira Obra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {books.map(book => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openBookDetail(book)}
              className="bg-white rounded-3xl border border-gray-200/80 hover:border-konecta-gold hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer overflow-hidden"
            >
              <div>
                {/* Book Cover Frame (2:3 Aspect Ratio) */}
                <div className="aspect-[2/3] bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="p-4 text-center text-konecta-navy space-y-2">
                      <Book size={36} className="text-konecta-gold mx-auto" />
                      <span className="text-[10px] font-bold block uppercase tracking-wider text-gray-500">{book.genre}</span>
                      <span className="text-xs font-black line-clamp-3 leading-tight">{book.title}</span>
                    </div>
                  )}

                  {/* Rating Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-black text-konecta-navy shadow-sm flex items-center gap-1">
                    <Star size={11} className="text-amber-500 fill-amber-500" />
                    <span>{book.average_rating || '5.0'}</span>
                  </div>

                  {/* PDF Badge if available */}
                  {book.pdf_url && (
                    <div className="absolute bottom-2.5 left-2.5 bg-konecta-navy/90 backdrop-blur-md text-konecta-gold px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm flex items-center gap-1">
                      <FileCheck size={11} />
                      <span>PDF</span>
                    </div>
                  )}

                  {/* Spine simulated shadow */}
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-black/10 pointer-events-none" />
                </div>

                {/* Metadata */}
                <div className="p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-konecta-gold block">
                    {book.genre}
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-konecta-navy line-clamp-2 group-hover:text-konecta-gold transition-colors leading-snug">
                    {book.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate">
                    Por {book.profiles?.full_name || 'Autor'}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-500 truncate max-w-[90px] sm:max-w-[120px]">
                  {book.pdf_url ? 'PDF & Capítulos' : `${book.chapters_count || 0} cap.`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startOnlineReading(book);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                  title="Ler Obra Online"
                >
                  <BookOpen size={12} />
                  <span>Ler Online</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* BOOK DETAIL & READER MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-konecta-navy/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-[32px] max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              {/* Modal Top Bar */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-konecta-gold">
                      {selectedBook.genre}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500 font-medium">
                      Idioma: {selectedBook.language || 'Português'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-konecta-navy tracking-tight">
                    {selectedBook.title}
                  </h2>
                  {selectedBook.subtitle && (
                    <p className="text-xs sm:text-sm text-gray-500 italic font-serif">
                      {selectedBook.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 font-medium pt-0.5">
                    Autor(a): <strong className="text-konecta-navy">{selectedBook.profiles?.full_name || 'Escritor Konecta'}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openShareSheet({
                      targetId: selectedBook.id,
                      targetType: 'book',
                      title: selectedBook.title,
                      authorName: selectedBook.profiles?.full_name || 'Autor',
                      thumbnail: selectedBook.cover_url || undefined
                    })}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-konecta-navy hover:bg-gray-50 transition-colors cursor-pointer"
                    title="Partilhar Obra"
                  >
                    <Share2 size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Author Hidden File Inputs */}
              {user && (selectedBook.author_id === user.id || selectedBook.author_id === user.user_id) && (
                <>
                  <input
                    ref={authorCoverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAuthorCoverChange}
                    className="hidden"
                  />
                  <input
                    ref={authorPdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleAuthorPdfChange}
                    className="hidden"
                  />
                </>
              )}

              {/* Author Management Banner */}
              {user && (selectedBook.author_id === user.id || selectedBook.author_id === user.user_id) && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5 text-xs text-amber-950">
                    <Sparkles size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-konecta-navy">Painel do Escritor / Autor da Obra</p>
                      <p className="text-[11px] text-amber-800">Podes carregar ou substituir a capa do livro e o ficheiro PDF a qualquer momento.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => authorCoverInputRef.current?.click()}
                      disabled={uploadingBookCover}
                      className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-konecta-navy font-bold text-xs hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      {uploadingBookCover ? <Loader2 size={13} className="animate-spin text-konecta-gold" /> : <ImageIcon size={13} className="text-konecta-gold" />}
                      <span>{selectedBook.cover_url ? 'Alterar Capa' : 'Carregar Capa'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => authorPdfInputRef.current?.click()}
                      disabled={uploadingBookPdf}
                      className="px-3 py-1.5 rounded-xl bg-konecta-navy text-white font-bold text-xs hover:bg-konecta-gold hover:text-konecta-navy flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    >
                      {uploadingBookPdf ? <Loader2 size={13} className="animate-spin text-konecta-gold" /> : <Upload size={13} />}
                      <span>{selectedBook.pdf_url ? 'Substituir PDF' : 'Carregar PDF'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Main Content: Book Overview & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Book Cover & Metadata */}
                <div className="lg:col-span-4 space-y-6">
                  {/* 3D Cover Display */}
                  <div className="aspect-[2/3] w-full max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-gray-200 relative group">
                    {selectedBook.cover_url ? (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full p-4 flex flex-col justify-between text-white text-center">
                        <span className="text-[10px] uppercase font-bold text-konecta-gold">{selectedBook.genre}</span>
                        <Book size={48} className="mx-auto text-white/40" />
                        <span className="text-xs font-bold">{selectedBook.title}</span>
                      </div>
                    )}
                    <div className="absolute inset-y-0 left-0 w-2 bg-white/20 pointer-events-none" />

                    {/* Author Cover Upload Button Overlay */}
                    {user && (selectedBook.author_id === user.id || selectedBook.author_id === user.user_id) && (
                      <button
                        type="button"
                        onClick={() => authorCoverInputRef.current?.click()}
                        disabled={uploadingBookCover}
                        className="absolute bottom-2.5 inset-x-2.5 py-1.5 px-3 rounded-xl bg-konecta-navy/90 hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-[11px] shadow-lg backdrop-blur-md flex items-center justify-center gap-1.5 transition-all cursor-pointer opacity-90 hover:opacity-100"
                        title="Carregar ou substituir a capa desta obra"
                      >
                        {uploadingBookCover ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>A carregar capa...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={12} />
                            <span>{selectedBook.cover_url ? 'Alterar Capa' : 'Carregar Capa'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Primary Reading Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => startOnlineReading(selectedBook)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-konecta-gold to-amber-500 hover:from-amber-500 hover:to-konecta-gold text-konecta-navy font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
                    >
                      <BookOpen size={18} />
                      <span>Iniciar Leitura Online</span>
                    </button>

                    {selectedBook.pdf_url ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => startOnlineReading(selectedBook, undefined, 'pdf')}
                            className="py-2.5 px-3 rounded-xl bg-konecta-navy hover:bg-konecta-navy/90 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Abrir no Leitor PDF Integrado"
                          >
                            <FileText size={15} />
                            <span>Leitor PDF</span>
                          </button>
                          <a
                            href={selectedBook.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ExternalLink size={14} />
                            <span>Nova Aba</span>
                          </a>
                        </div>

                        {/* Author Replace PDF Option */}
                        {user && (selectedBook.author_id === user.id || selectedBook.author_id === user.user_id) && (
                          <button
                            type="button"
                            onClick={() => authorPdfInputRef.current?.click()}
                            disabled={uploadingBookPdf}
                            className="w-full py-2 px-3 rounded-xl border border-dashed border-gray-300 hover:border-konecta-gold hover:bg-amber-50/50 text-gray-600 hover:text-konecta-navy font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {uploadingBookPdf ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                <span>A atualizar PDF...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={12} />
                                <span>Substituir Ficheiro PDF</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-center">
                        <p className="text-xs text-amber-800 font-medium">
                          Documento PDF ainda não disponibilizado pelo autor.
                        </p>
                        {user && (selectedBook.author_id === user.id || selectedBook.author_id === user.user_id) && (
                          <button
                            type="button"
                            onClick={() => authorPdfInputRef.current?.click()}
                            disabled={uploadingBookPdf}
                            className="w-full py-2.5 px-3 rounded-xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            {uploadingBookPdf ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>A carregar PDF...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={14} />
                                <span>Carregar Livro em PDF Agora</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Synopsis Box */}
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                    <h4 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">Sinopse</h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-serif whitespace-pre-wrap">
                      {selectedBook.synopsis || 'Nenhuma sinopse disponível.'}
                    </p>
                  </div>

                  {/* Copyright Notice */}
                  <div className="text-[11px] text-gray-400 p-2">
                    <p><strong>Direitos de Autor:</strong> {selectedBook.copyright_notice || 'Todos os direitos reservados'}</p>
                  </div>
                </div>

                {/* Right Column: Chapters & Reviews */}
                <div className="lg:col-span-8 space-y-6">

                  {/* Chapters Section (Preserved) */}
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-konecta-navy" />
                        <h3 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">
                          Capítulos da Obra ({chapters.length})
                        </h3>
                      </div>
                      {user && selectedBook.author_id === user.id && (
                        <button
                          onClick={() => setShowChapterModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-konecta-navy text-white text-[10px] font-bold uppercase tracking-wider hover:bg-konecta-gold hover:text-konecta-navy transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} />
                          <span>Adicionar Capítulo</span>
                        </button>
                      )}
                    </div>

                    {chapters.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">
                        Esta obra está disponível em formato de documento PDF completo.
                      </p>
                    ) : (
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {chapters.map((ch: any) => (
                          <button
                            key={ch.id}
                            onClick={() => setCurrentChapter(ch)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                              currentChapter?.id === ch.id
                                ? 'bg-konecta-navy text-white shadow-sm'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            }`}
                          >
                            Cap. {ch.chapter_number}: {ch.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Chapter Content Viewer */}
                    {currentChapter && (
                      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 flex-wrap gap-2">
                          <h4 className="text-lg font-bold text-konecta-navy">
                            {currentChapter.chapter_number}. {currentChapter.title}
                          </h4>
                          <button
                            onClick={() => startOnlineReading(selectedBook, currentChapter.id)}
                            className="px-3 py-1.5 rounded-xl bg-konecta-gold/20 hover:bg-konecta-gold text-konecta-navy font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Ler este capítulo em ecrã completo"
                          >
                            <BookOpen size={13} />
                            <span>Ler no Leitor Imersivo</span>
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed font-serif whitespace-pre-wrap max-h-80 overflow-y-auto pr-2">
                          {currentChapter.content}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reviews & Author Replies Section */}
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={16} className="text-konecta-navy" />
                        <h3 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">
                          Avaliações & Comentários dos Leitores ({reviews.length})
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Star size={13} fill="currentColor" />
                        <span>Média: {selectedBook.average_rating || '5.0'} / 5</span>
                      </div>
                    </div>

                    {/* Submit Review Form */}
                    <form onSubmit={handleAddReview} className="space-y-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-konecta-navy">Avaliar esta obra:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((starVal) => (
                            <button
                              type="button"
                              key={starVal}
                              onClick={() => setRating(starVal)}
                              className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star size={18} fill={starVal <= rating ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        required
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escreve o teu comentário ou crítica construtiva para o autor..."
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-konecta-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-konecta-navy/20 resize-none"
                      />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={submittingReview || !comment.trim()}
                          className="px-5 py-2.5 rounded-xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                        >
                          {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          <span>Publicar Avaliação</span>
                        </button>
                      </div>
                    </form>

                    {/* Reviews List with Real Profile & Author Replies */}
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                      {reviews.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">
                          Ainda não existem avaliações para esta obra. Sê o primeiro a comentar!
                        </p>
                      ) : (
                        reviews.map((rev: any) => {
                          const reviewerDisplayName = rev.reviewer_name?.trim() || (rev.reviewer_username ? `@${rev.reviewer_username}` : 'Leitor');
                          const isAuthor = user && selectedBook.author_id === user.id;

                          return (
                            <div key={rev.reviewer_id || rev.id} className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3 shadow-xs">
                              {/* Reviewer Header */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* Reviewer Avatar */}
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-konecta-navy to-slate-700 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 border border-gray-100">
                                    {rev.reviewer_avatar_url ? (
                                      <img src={rev.reviewer_avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{reviewerDisplayName.charAt(0).toUpperCase()}</span>
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-extrabold text-konecta-navy">{reviewerDisplayName}</span>
                                      {rev.reviewer_username && (
                                        <span className="text-[10px] text-gray-400">@{rev.reviewer_username}</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400">
                                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('pt-AO') : ''}
                                    </span>
                                  </div>
                                </div>

                                {/* Stars */}
                                <div className="flex items-center gap-0.5 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={12} fill={i < (rev.rating || 5) ? 'currentColor' : 'none'} />
                                  ))}
                                </div>
                              </div>

                              {/* Review Comment Text */}
                              <p className="text-xs text-gray-700 leading-relaxed font-serif pl-12">
                                {rev.review || rev.comment}
                              </p>

                              {/* Author Reply (if exists) */}
                              {rev.author_reply ? (
                                <div className="ml-10 p-3.5 bg-gradient-to-r from-amber-50/60 to-blue-50/40 rounded-xl border-l-4 border-l-konecta-gold border border-gray-100 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <CornerDownRight size={14} className="text-konecta-gold shrink-0" />
                                      <span className="text-[11px] font-extrabold text-konecta-navy flex items-center gap-1.5">
                                        <span>Resposta do Autor</span>
                                        <span className="px-1.5 py-0.2 rounded bg-konecta-gold text-konecta-navy text-[9px] font-black uppercase">
                                          Autor
                                        </span>
                                      </span>
                                    </div>

                                    {/* Author edit button */}
                                    {isAuthor && (
                                      <button
                                        onClick={() => {
                                          setReplyingReviewerId(rev.reviewer_id);
                                          setEditingReplyId(rev.reply_id);
                                          setReplyText(rev.author_reply);
                                        }}
                                        className="text-[10px] font-bold text-gray-500 hover:text-konecta-navy flex items-center gap-1 cursor-pointer"
                                      >
                                        <Pencil size={11} />
                                        <span>Editar</span>
                                      </button>
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-700 leading-relaxed italic pl-5">
                                    "{rev.author_reply}"
                                  </p>

                                  {rev.reply_created_at && (
                                    <p className="text-[10px] text-gray-400 pl-5">
                                      Respondido em {new Date(rev.reply_created_at).toLocaleDateString('pt-AO')}
                                    </p>
                                  )}
                                </div>
                              ) : null}

                              {/* Author Reply Button (if no reply yet) */}
                              {isAuthor && !rev.author_reply && replyingReviewerId !== rev.reviewer_id && (
                                <div className="pl-12 pt-1">
                                  <button
                                    onClick={() => {
                                      setReplyingReviewerId(rev.reviewer_id);
                                      setEditingReplyId(null);
                                      setReplyText('');
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-konecta-gold hover:text-konecta-navy transition-colors cursor-pointer"
                                  >
                                    <CornerDownRight size={13} />
                                    <span>Responder como Autor à avaliação</span>
                                  </button>
                                </div>
                              )}

                              {/* Inline Author Reply Form */}
                              {isAuthor && replyingReviewerId === rev.reviewer_id && (
                                <div className="ml-10 p-3 bg-white rounded-xl border border-konecta-gold/50 shadow-sm space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-konecta-navy">
                                    <span>{editingReplyId ? 'Editar Resposta do Autor' : 'Responder ao Leitor'}</span>
                                    <button
                                      onClick={() => {
                                        setReplyingReviewerId(null);
                                        setEditingReplyId(null);
                                        setReplyText('');
                                      }}
                                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  <textarea
                                    rows={2}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Escreve uma resposta cordial e atenciosa ao leitor..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-700 focus:outline-none focus:border-konecta-gold resize-none"
                                  />

                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyingReviewerId(null);
                                        setEditingReplyId(null);
                                        setReplyText('');
                                      }}
                                      className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={submittingReply || !replyText.trim()}
                                      onClick={() => handleSaveAuthorReply(rev.reviewer_id, editingReplyId || undefined)}
                                      className="px-4 py-1.5 rounded-lg bg-konecta-gold text-konecta-navy font-bold text-xs hover:bg-konecta-navy hover:text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                    >
                                      {submittingReply ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                      <span>{editingReplyId ? 'Atualizar Resposta' : 'Enviar Resposta'}</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* EMBEDDED PDF VIEWER MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isPdfViewerOpen && selectedBook?.pdf_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-konecta-navy/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* PDF Viewer Header */}
              <div className="p-4 sm:px-6 bg-konecta-navy text-white flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={20} className="text-konecta-gold shrink-0" />
                  <div className="truncate">
                    <h3 className="text-sm font-bold truncate">{selectedBook.title}</h3>
                    <p className="text-[11px] text-gray-300 truncate">Autor: {selectedBook.profiles?.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={selectedBook.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Abrir em Nova Aba"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">Nova Aba</span>
                  </a>
                  <a
                    href={selectedBook.pdf_url}
                    download
                    className="p-2 rounded-xl bg-konecta-gold text-konecta-navy text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Descarregar Ficheiro PDF"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Descarregar</span>
                  </a>
                  <button
                    onClick={() => setIsPdfViewerOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* PDF Embedded Frame */}
              <div className="flex-1 w-full bg-slate-100 relative">
                <iframe
                  src={`${selectedBook.pdf_url}#toolbar=1&navpanes=0`}
                  title={selectedBook.title}
                  className="w-full h-full border-none"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* IMMERSIVE ONLINE BOOK READER (SISTEMA DE LEITURA ONLINE) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {readingBook && (
          <OnlineBookReader
            book={readingBook}
            chapters={readingChapters}
            initialChapterId={readingInitialChapterId}
            initialMode={readingInitialMode}
            onClose={() => setReadingBook(null)}
            onOpenReviews={() => {
              const b = readingBook;
              setReadingBook(null);
              openBookDetail(b);
            }}
            onShare={(b) =>
              openShareSheet({
                targetId: b.id,
                targetType: 'book',
                title: b.title,
                authorName: b.profiles?.full_name || 'Autor',
                thumbnail: b.cover_url || undefined
              })
            }
            user={user}
          />
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* PUBLISH NEW LITERARY WORK MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showCreateBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-konecta-navy/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-black text-konecta-navy">Publicar Nova Obra Literária</h3>
                  <p className="text-xs text-gray-500">Regista a tua obra literária no catálogo da KONECTA Angola com upload de capa, PDF ou escrita por capítulos.</p>
                </div>
                <button
                  onClick={() => setShowCreateBookModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateBook} className="space-y-5">

                {/* 1. Basic Book Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-konecta-navy uppercase tracking-wider flex items-center gap-1.5">
                    <Book size={14} className="text-konecta-gold" />
                    <span>Informações da Obra</span>
                  </h4>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Título da Obra *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: O Canto do Rio Kwanza, Memórias de Luanda..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-konecta-navy font-semibold focus:outline-none focus:ring-2 focus:ring-konecta-navy/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Subtítulo (Opcional)</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Ex: Poemas e Crónicas da Terra Vermelha"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-konecta-navy/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Categoria Literária *</label>
                      <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none"
                      >
                        {genres.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 block">Idioma *</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-800 focus:outline-none"
                      >
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Sinopse da Obra *</label>
                    <textarea
                      required
                      rows={3}
                      value={synopsis}
                      onChange={(e) => setSynopsis(e.target.value)}
                      placeholder="Descreve o enredo, a mensagem central ou o propósito da tua obra literária..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-konecta-navy/20 font-serif"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Direitos de Autor</label>
                    <input
                      type="text"
                      value={copyrightNotice}
                      onChange={(e) => setCopyrightNotice(e.target.value)}
                      placeholder="Ex: Todos os direitos reservados © 2026 Autor"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Book Cover Section */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-konecta-navy uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-konecta-gold" />
                      <span>Capa do Livro (JPG, PNG ou WEBP)</span>
                    </h4>
                    {coverPreview && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> Capa Selecionada
                      </span>
                    )}
                  </div>

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />

                  {coverPreview ? (
                    <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200">
                      <div className="w-14 aspect-[2/3] rounded-lg overflow-hidden bg-slate-200 shadow-sm shrink-0 border border-gray-100">
                        <img src={coverPreview} alt="Pré-visualização" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-konecta-navy truncate">
                          {coverFile?.name || 'Capa Selecionada'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {coverFile ? formatFileSize(coverFile.size) : 'Imagem anexada'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Substituir Capa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverFile(null);
                          setCoverPreview(null);
                          setCoverUrl('');
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-konecta-gold rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white/60 space-y-1"
                    >
                      <Upload size={22} className="mx-auto text-gray-400" />
                      <p className="text-xs font-bold text-konecta-navy">Carregar Capa do Livro</p>
                      <p className="text-[10px] text-gray-400">Formatos aceites: JPG, PNG, WEBP (Proporção vertical recomendada)</p>
                    </div>
                  )}
                </div>

                {/* 3. Book PDF File Section (Optional) */}
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-konecta-navy uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-konecta-navy" />
                      <span>Ficheiro do Livro em PDF (Opcional)</span>
                    </h4>
                    {pdfFileName && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12} /> PDF Anexado
                      </span>
                    )}
                  </div>

                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    className="hidden"
                  />

                  {pdfFileName ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-konecta-navy truncate">{pdfFileName}</p>
                        <p className="text-[10px] text-gray-400">{pdfFileSize || 'Ficheiro PDF'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        Substituir PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfFile(null);
                          setPdfFileName('');
                          setPdfFileSize('');
                          setPdfUrl('');
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => pdfInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-konecta-navy rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white/60 space-y-1"
                    >
                      <FileText size={22} className="mx-auto text-gray-400" />
                      <p className="text-xs font-bold text-konecta-navy">Carregar Livro em PDF</p>
                      <p className="text-[10px] text-gray-400">Podes carregar a capa, o PDF, ambos, ou adicionar capítulos de texto online a qualquer momento.</p>
                    </div>
                  )}

                  {/* Progress Indicator during upload */}
                  {creating && uploadProgress > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                        <span>A carregar ficheiros para o Supabase Storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-konecta-gold transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Drive Option */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDriveModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-50/60 hover:bg-blue-100/60 text-blue-700 border border-blue-200 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                    <span>Importar Documento do Google Drive</span>
                  </button>

                  {driveBookDoc && (
                    <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                      <div className="truncate">
                        <span className="font-bold">Drive Anexado:</span> {driveBookDoc.name}
                      </div>
                      <span className="text-[10px] text-blue-700 shrink-0 font-medium">{driveBookDoc.sizeFormatted}</span>
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateBookModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !title.trim()}
                    className="px-6 py-2.5 rounded-xl bg-konecta-navy hover:bg-konecta-gold text-white hover:text-konecta-navy font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>A Publicar...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen size={14} />
                        <span>Publicar Obra Literária</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* ADD CHAPTER MODAL (PRESERVED) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showChapterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-konecta-navy flex items-center gap-2">
                  <Plus size={16} className="text-konecta-gold" />
                  <span>Adicionar Capítulo à Obra</span>
                </h3>
                <button onClick={() => setShowChapterModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddChapter} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Nº do Capítulo</label>
                    <input
                      type="number"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-konecta-navy"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Título do Capítulo *</label>
                    <input
                      type="text"
                      required
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="Ex: O Regresso à Vila, O Despertar..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-konecta-navy"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Conteúdo do Capítulo *</label>
                  <textarea
                    required
                    rows={8}
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    placeholder="Escreve ou cola aqui o texto integral do capítulo..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 resize-none font-serif leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowChapterModal(false)}
                    className="px-4 py-2 text-xs text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingChapter || !chapterTitle.trim() || !chapterContent.trim()}
                    className="px-5 py-2 rounded-xl bg-konecta-navy text-white hover:bg-konecta-gold hover:text-konecta-navy text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {savingChapter ? 'A Gravar...' : 'Guardar Capítulo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Drive Document Picker Modal */}
      <GoogleDrivePickerModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        title="Selecionar Documento / Livro do Google Drive"
        onSelectDocument={(doc) => {
          setDriveBookDoc(doc);
          if (!title.trim()) {
            setTitle(doc.name.replace(/\.[^/.]+$/, ''));
          }
          if (doc.cloudinaryUrl) {
            setPdfUrl(doc.cloudinaryUrl);
            setPdfFileName(doc.name);
            setPdfFileSize(doc.sizeFormatted || 'Ficheiro Drive');
          }
        }}
      />
    </div>
  );
};
