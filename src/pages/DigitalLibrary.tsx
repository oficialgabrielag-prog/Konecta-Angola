import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';

interface DigitalLibraryProps {
  user: any;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DigitalLibrary: React.FC<DigitalLibraryProps> = ({ user, onOpenAuth, onNavigateTab }) => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Book for Reading / Detail
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentChapter, setCurrentChapter] = useState<any | null>(null);

  // Review form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Create Book Modal
  const [showCreateBookModal, setShowCreateBookModal] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('Literatura');
  const [language, setLanguage] = useState('Português');
  const [coverUrl, setCoverUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Add Chapter Modal
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [savingChapter, setSavingChapter] = useState(false);

  const genres = [
    'Literatura', 'Poesia', 'Ensaio', 'História de Angola', 'Ficção', 'Desenvolvimento Pessoal', 'Ciência e Tecnologia'
  ];

  useEffect(() => {
    fetchBooks();
  }, [selectedGenre]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await d1Client.organizations.listBooks({ genre: selectedGenre });
      setBooks(res.data?.data || res.data || []);
    } catch (err) {
      console.warn('Erro ao carregar livros:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await d1Client.organizations.listBooks({ search: searchQuery });
      setBooks(res.data?.data || res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const openBookDetail = async (book: any) => {
    setSelectedBook(book);
    setChapters(book.book_chapters || []);
    setReviews(book.book_reviews || []);
    if (book.book_chapters?.length > 0) {
      setCurrentChapter(book.book_chapters[0]);
    } else {
      setCurrentChapter(null);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!title.trim() || creating) return;

    setCreating(true);
    try {
      const res = await d1Client.organizations.createBook({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        synopsis: synopsis.trim() || undefined,
        genre,
        language,
        cover_url: coverUrl || undefined
      });

      if (res.error) throw new Error(res.error.message || 'Erro ao criar livro.');

      setShowCreateBookModal(false);
      setTitle('');
      setSubtitle('');
      setSynopsis('');
      setCoverUrl('');
      fetchBooks();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar livro.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim() || !chapterContent.trim() || savingChapter || !selectedBook) return;

    setSavingChapter(true);
    try {
      await d1Client.organizations.createChapter(selectedBook.id, {
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
        chapter_number: chapterNumber
      });

      setShowChapterModal(false);
      setChapterTitle('');
      setChapterContent('');
      setChapterNumber(chapters.length + 2);

      // Refresh book
      const fresh = await d1Client.organizations.getBookById(selectedBook.id);
      if (fresh.data) {
        setSelectedBook(fresh.data);
        setChapters(fresh.data.book_chapters || []);
        if (!currentChapter && fresh.data.book_chapters?.length > 0) {
          setCurrentChapter(fresh.data.book_chapters[0]);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar capítulo.');
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
      await d1Client.organizations.addReview(selectedBook.id, rating, comment.trim());
      setComment('');
      // Refresh book
      const fresh = await d1Client.organizations.getBookById(selectedBook.id);
      if (fresh.data) {
        setSelectedBook(fresh.data);
        setReviews(fresh.data.book_reviews || []);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar avaliação.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-konecta-gold uppercase">Literatura & Conhecimento</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight mt-1">Biblioteca Digital & Autores</h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            Descobre obras de escritores e poetas angolanos, lê capítulos online, avalia livros e publica as tuas próprias criações literárias.
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowCreateBookModal(true);
          }}
          className="btn-gold whitespace-nowrap text-xs py-3 px-6 shadow-md flex items-center gap-2 self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-lg">library_add</span>
          Publicar Livro ou Obra
        </button>
      </header>

      {/* Genres Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        <button
          onClick={() => setSelectedGenre('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedGenre === 'all' ? 'bg-konecta-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Todos os Géneros
        </button>
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGenre(g)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedGenre === g ? 'bg-konecta-navy text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="mb-10 relative max-w-xl mx-auto">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
          <span className="material-symbols-outlined">search</span>
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar por título ou sinopse..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs shadow-sm focus:outline-none focus:border-konecta-gold"
        />
      </form>

      {/* Books Grid */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-28 bg-white rounded-3xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">menu_book</span>
          <p className="text-gray-600 font-semibold text-sm">Nenhum livro encontrado na biblioteca.</p>
          <button 
            onClick={() => user ? setShowCreateBookModal(true) : onOpenAuth()}
            className="mt-6 btn-gold text-xs py-2.5 px-6"
          >
            Publicar Primeira Obra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {books.map(book => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openBookDetail(book)}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="aspect-[3/4] bg-gradient-to-br from-konecta-navy/20 to-konecta-gold/20 relative overflow-hidden flex items-center justify-center">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="text-center p-6 text-konecta-navy">
                      <span className="material-symbols-outlined text-5xl text-konecta-gold mb-2 block">book</span>
                      <span className="text-xs font-bold">{book.genre}</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-black text-konecta-navy">
                    ★ {book.average_rating || '0.0'}
                  </div>
                </div>

                <div className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-konecta-gold block mb-1">
                    {book.genre}
                  </span>
                  <h3 className="text-base font-bold text-konecta-navy line-clamp-1 group-hover:text-konecta-gold transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Por {book.profiles?.full_name || 'Autor'}</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0 flex items-center justify-between text-xs text-gray-500">
                <span>{book.chapters_count || 0} capítulos</span>
                <span className="font-bold text-konecta-navy group-hover:underline">Ler obra</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Book Reader / Detail Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-konecta-gold uppercase">{selectedBook.genre}</span>
                  <h2 className="text-2xl font-black text-konecta-navy">{selectedBook.title}</h2>
                  <p className="text-xs text-gray-400">Por {selectedBook.profiles?.full_name}</p>
                </div>
                <button onClick={() => setSelectedBook(null)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Chapters Navigation */}
                <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">Capítulos</h3>
                    {user && selectedBook.author_id === user.id && (
                      <button onClick={() => setShowChapterModal(true)} className="btn-primary py-1 px-3 text-[10px]">
                        + Adicionar
                      </button>
                    )}
                  </div>

                  {chapters.length === 0 ? (
                    <p className="text-xs text-gray-400">Ainda não existem capítulos publicados.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {chapters.map((ch: any) => (
                        <button
                          key={ch.id}
                          onClick={() => setCurrentChapter(ch)}
                          className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${
                            currentChapter?.id === ch.id ? 'bg-konecta-navy text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {ch.chapter_number}. {ch.title}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <p><strong>Direitos:</strong> {selectedBook.copyright_notice}</p>
                  </div>
                </div>

                {/* Chapter Reading Viewer */}
                <div className="lg:col-span-2 space-y-6">
                  {currentChapter ? (
                    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                      <h3 className="text-xl font-bold text-konecta-navy border-b pb-3">{currentChapter.chapter_number}. {currentChapter.title}</h3>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                        {currentChapter.content}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center text-gray-400">
                      Seleciona um capítulo para iniciar a leitura.
                    </div>
                  )}

                  {/* Reviews Section */}
                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <h3 className="text-xs font-bold text-konecta-navy uppercase tracking-wider">Avaliações & Comentários ({reviews.length})</h3>
                    
                    <form onSubmit={handleAddReview} className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">Classificação:</span>
                        <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="bg-gray-50 border rounded-lg px-2 py-1 text-xs font-bold">
                          <option value={5}>★★★★★ (5)</option>
                          <option value={4}>★★★★☆ (4)</option>
                          <option value={3}>★★★☆☆ (3)</option>
                          <option value={2}>★★☆☆☆ (2)</option>
                          <option value={1}>★☆☆☆☆ (1)</option>
                        </select>
                      </div>
                      <textarea
                        required
                        rows={2}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Deixa o teu comentário sobre a obra..."
                        className="w-full bg-gray-50 border rounded-xl p-3 text-xs resize-none"
                      />
                      <button type="submit" disabled={submittingReview || !comment.trim()} className="btn-primary py-2 px-4 text-xs">
                        Publicar Avaliação
                      </button>
                    </form>

                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {reviews.map((rev: any) => (
                        <div key={rev.id} className="p-3 bg-white rounded-xl border border-gray-100 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-konecta-navy">Leitor</span>
                            <span className="text-konecta-gold">{'★'.repeat(rev.rating)}</span>
                          </div>
                          <p className="text-gray-600">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Book Modal */}
      <AnimatePresence>
        {showCreateBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4">
              <h3 className="text-lg font-bold text-konecta-navy">Publicar Nova Obra Literária</h3>
              <form onSubmit={handleCreateBook} className="space-y-4">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do Livro"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                />
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subtítulo (opcional)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                />
                <textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Sinopse..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                />
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium"
                >
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="file"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const res = await uploadMediaToCloudinary(f);
                      setCoverUrl(res.secure_url);
                    }
                  }}
                  className="text-xs text-gray-500"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateBookModal(false)} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={creating || !title.trim()} className="btn-primary py-2 px-5 text-xs">Publicar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Chapter Modal */}
      <AnimatePresence>
        {showChapterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4">
              <h3 className="text-lg font-bold text-konecta-navy">Adicionar Capítulo</h3>
              <form onSubmit={handleAddChapter} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                    placeholder="Nº"
                    className="bg-gray-50 border rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Título do Capítulo"
                    className="col-span-2 bg-gray-50 border rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <textarea
                  required
                  rows={8}
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  placeholder="Escreve ou cola o conteúdo do capítulo..."
                  className="w-full bg-gray-50 border rounded-xl p-3 text-xs resize-none font-serif"
                />
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowChapterModal(false)} className="text-xs text-gray-500">Cancelar</button>
                  <button type="submit" disabled={savingChapter || !chapterTitle.trim() || !chapterContent.trim()} className="btn-primary py-2 px-5 text-xs">Guardar Capítulo</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
