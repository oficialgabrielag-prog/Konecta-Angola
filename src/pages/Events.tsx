import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { d1Client } from '../lib/d1Client';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { useT } from '../i18n/LanguageContext';
import { useToast } from '../context/UIContext';

interface EventsProps {
  user: any;
  onOpenAuth: () => void;
}

export const Events: React.FC<EventsProps> = ({ user, onOpenAuth }) => {
  const t = useT();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'descobrir' | 'eventos' | 'workshops' | 'online' | 'minhas-inscricoes' | 'meus-eventos'>('descobrir');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Selected event for detail modal / organizer panel
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [attendeesList, setAttendeesList] = useState<any[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  // Create / Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'event' | 'workshop'>('event');
  const [format, setFormat] = useState<'presencial' | 'online' | 'híbrido'>('presencial');
  const [venue, setVenue] = useState('');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [category, setCategory] = useState('Tecnologia e Inovação');
  const [requirements, setRequirements] = useState('');
  const [agenda, setAgenda] = useState('');
  const [certificateAvailable, setCertificateAvailable] = useState(false);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  // Action loading per event
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadEvents();
  }, [activeTab, selectedCategory]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let res: any;
      if (activeTab === 'minhas-inscricoes') {
        res = await d1Client.events.getMyAttendances();
      } else if (activeTab === 'meus-eventos') {
        res = await d1Client.events.getMyEvents();
      } else {
        const filter: any = {};
        if (activeTab === 'workshops') filter.event_type = 'workshop';
        if (activeTab === 'eventos') filter.event_type = 'event';
        if (activeTab === 'online') filter.format = 'online';
        if (selectedCategory !== 'all') filter.category = selectedCategory;

        res = await d1Client.events.list(filter);
      }

      setEvents(res.data?.data || res.data || []);
      setError(null);
    } catch (err: any) {
      console.warn('Erro ao carregar eventos:', err);
      setError(t('events.load_err'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await d1Client.events.list({ search: searchQuery });
      setEvents(res.data?.data || res.data || []);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const uploadRes = await uploadMediaToCloudinary(file);
      setCoverPhotoUrl(uploadRes.secure_url);
    } catch (err: any) {
      console.error('Erro ao carregar foto do evento:', err);
      showToast(err.message || t('profile.update_photo_err'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!title.trim() || !description.trim() || !startsAt || saving) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        event_type: eventType,
        format,
        venue: venue.trim() || (format === 'online' ? 'Online' : 'Luanda'),
        online_url: onlineUrl.trim() || null,
        starts_at: startsAt,
        ends_at: endsAt || startsAt,
        capacity: parseInt(capacity) || 100,
        category,
        requirements: requirements.trim() || null,
        agenda: agenda.trim() || null,
        certificate_available: certificateAvailable,
        cover_photo_url: coverPhotoUrl || null
      };

      let res: any;
      if (editingEventId) {
        res = await d1Client.events.update(editingEventId, payload);
      } else {
        res = await d1Client.events.create(payload);
      }

      if (res.error) {
        throw new Error(res.error.message || t('events.saving_err'));
      }

      setShowCreateModal(false);
      resetForm();
      loadEvents();
      showToast('Evento guardado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Erro ao guardar evento:', err);
      showToast(err.message || t('events.saving_err'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setEventType('event');
    setFormat('presencial');
    setVenue('');
    setOnlineUrl('');
    setStartsAt('');
    setEndsAt('');
    setCapacity('100');
    setCategory('Tecnologia e Inovação');
    setRequirements('');
    setAgenda('');
    setCertificateAvailable(false);
    setCoverPhotoUrl('');
  };

  const handleOpenEdit = (ev: any) => {
    setEditingEventId(ev.id);
    setTitle(ev.title || '');
    setDescription(ev.description || '');
    setEventType(ev.event_type || 'event');
    setFormat(ev.format || 'presencial');
    setVenue(ev.venue || '');
    setOnlineUrl(ev.online_url || '');
    setStartsAt(ev.starts_at ? ev.starts_at.slice(0, 16) : '');
    setEndsAt(ev.ends_at ? ev.ends_at.slice(0, 16) : '');
    setCapacity(String(ev.capacity || 100));
    setCategory(ev.category || 'Tecnologia e Inovação');
    setRequirements(ev.requirements || '');
    setAgenda(ev.agenda || '');
    setCertificateAvailable(!!ev.certificate_available);
    setCoverPhotoUrl(ev.cover_photo_url || ev.image_url || '');
    setShowCreateModal(true);
  };

  const handleResponse = async (eventId: string, response: 'going' | 'interested' | 'not_going') => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setActionLoading(prev => ({ ...prev, [eventId]: true }));
    try {
      const res = await d1Client.events.join(eventId, response);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        loadEvents();
        if (selectedEvent && selectedEvent.id === eventId) {
          const fresh = await d1Client.events.getById(eventId);
          if (fresh.data) setSelectedEvent(fresh.data);
        }
        showToast('Presença registada com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao atualizar participação:', err);
      showToast(err.message || t('events.update_err'), 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm(t('events.cancel_confirm'))) return;
    try {
      await d1Client.events.cancel(eventId);
      loadEvents();
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
      showToast('Evento cancelado com sucesso.', 'info');
    } catch (err: any) {
      console.error('Erro ao cancelar evento:', err);
      showToast(t('events.cancel_err'), 'error');
    }
  };

  const openEventDetail = async (ev: any) => {
    setSelectedEvent(ev);
    setLoadingAttendees(true);
    try {
      const res = await d1Client.events.getAttendees(ev.id);
      setAttendeesList(res.data?.data || res.data || []);
    } catch (e) {
      setAttendeesList([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const categories = [
    'Tecnologia e Inovação',
    'Empreendedorismo',
    'Energia e Sustentabilidade',
    'Inteligência Artificial',
    'Design e Criatividade',
    'Carreira e Liderança'
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 lg:py-16">
      
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-extrabold tracking-[0.2em] text-konecta-gold uppercase">{t('events.kicker')}</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-konecta-navy tracking-tight mt-1">{t('nav.events')}</h1>
          <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
            {t('events.subtitle')}
          </p>
        </div>
        <button 
          onClick={() => {
            if (!user) onOpenAuth();
            else {
              resetForm();
              setShowCreateModal(true);
            }
          }}
          className="btn-gold whitespace-nowrap text-xs py-3 px-6 shadow-md self-start md:self-auto flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          {t('events.create_btn')}
        </button>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-gray-200 no-scrollbar">
        {[
          { key: 'descobrir', label: t('events.tab_discover'), icon: 'explore' },
          { key: 'eventos', label: t('events.tab_events'), icon: 'event' },
          { key: 'workshops', label: t('events.tab_workshops'), icon: 'school' },
          { key: 'online', label: t('events.tab_online'), icon: 'wifi' },
          { key: 'minhas-inscricoes', label: t('events.tab_my_attendances'), icon: 'task_alt' },
          { key: 'meus-eventos', label: t('events.tab_my_events'), icon: 'dashboard_customize' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-konecta-navy text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <form onSubmit={handleSearch} className="flex-1 w-full relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <span className="material-symbols-outlined text-xl">search</span>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('events.search_placeholder')}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-xs shadow-sm focus:outline-none focus:border-konecta-gold"
          />
        </form>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm focus:outline-none focus:border-konecta-gold w-full sm:w-auto"
        >
          <option value="all">{t('events.all_categories')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Main Content Feed */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center max-w-lg mx-auto border border-red-100">
          <p className="font-bold">{t('common.error')}</p>
          <p className="text-xs mt-2">{error}</p>
          <button onClick={loadEvents} className="mt-4 btn-primary py-2 text-xs">{t('create.retry')}</button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-28 bg-white rounded-3xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">event_busy</span>
          <p className="text-gray-600 font-semibold text-sm">{t('events.empty_title')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('events.empty_desc')}</p>
          <button 
            onClick={() => {
              if (!user) onOpenAuth();
              else {
                resetForm();
                setShowCreateModal(true);
              }
            }}
            className="mt-6 btn-gold text-xs py-2.5 px-6"
          >
            {t('events.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => {
            const isCancelled = ev.status === 'cancelled';
            const isWorkshop = ev.event_type === 'workshop';
            const isGoing = ev.attendees?.some((a: any) => a.user_id === user?.id && a.response === 'going') || ev.my_response === 'going';
            const isInterested = ev.attendees?.some((a: any) => a.user_id === user?.id && a.response === 'interested') || ev.my_response === 'interested';

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: '0', y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video relative bg-gradient-to-br from-konecta-navy/10 to-konecta-gold/10 overflow-hidden">
                    {ev.cover_photo_url || ev.image_url ? (
                      <img src={ev.cover_photo_url || ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-konecta-navy p-4">
                        <span className="material-symbols-outlined text-4xl text-konecta-gold mb-1">
                          {isWorkshop ? 'school' : 'event'}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-konecta-navy">
                          {isWorkshop ? t('events.type_workshop') : t('events.type_event')}
                        </span>
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
                        isWorkshop ? 'bg-konecta-gold text-konecta-navy' : 'bg-konecta-navy text-white'
                      }`}>
                        {isWorkshop ? t('events.type_workshop') : t('events.type_event')}
                      </span>
                      <span className="bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[9px] font-extrabold text-gray-700 uppercase tracking-widest">
                        {ev.format || t('events.format_presencial')}
                      </span>
                    </div>

                    {isCancelled && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-red-600 text-white text-[10px] font-black px-4 py-1.5 uppercase tracking-[0.2em]">
                          {t('events.cancelled')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span className="material-symbols-outlined text-[16px] text-konecta-gold">calendar_month</span>
                      <span>{new Date(ev.starts_at || ev.date).toLocaleDateString('pt-AO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <h3 
                      onClick={() => openEventDetail(ev)}
                      className="text-lg font-bold text-konecta-navy mb-2 line-clamp-1 hover:text-konecta-gold cursor-pointer transition-colors"
                    >
                      {ev.title}
                    </h3>
                    
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                      {ev.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
                      <span className="material-symbols-outlined text-[16px] text-gray-400">location_on</span>
                      <span className="truncate">{ev.venue || 'Luanda'}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-konecta-navy block uppercase tracking-tighter">
                      {ev.participant_count || 0} / {ev.capacity || 100} {t('events.vagas')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">
                      {t('library.by')} {ev.profiles?.full_name || t('profile.personal_post')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEventDetail(ev)}
                      className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-konecta-navy bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      {t('events.details')}
                    </button>

                    {!isCancelled && (
                      <button
                        onClick={() => handleResponse(ev.id, isGoing ? 'not_going' : 'going')}
                        disabled={actionLoading[ev.id]}
                        className={`py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          isGoing 
                            ? 'bg-green-600 text-white' 
                            : 'btn-primary'
                        }`}
                      >
                        {actionLoading[ev.id] ? '...' : isGoing ? t('events.joined_status') : t('events.join_btn')}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-[10px] font-black uppercase ${selectedEvent.event_type === 'workshop' ? 'bg-konecta-gold text-konecta-navy' : 'bg-konecta-navy text-white'}`}>
                    {selectedEvent.event_type === 'workshop' ? t('events.type_workshop') : t('events.type_event')}
                  </span>
                  <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">{selectedEvent.format}</span>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {selectedEvent.cover_photo_url || selectedEvent.image_url ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                  <img src={selectedEvent.cover_photo_url || selectedEvent.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}

              <div>
                <h2 className="text-2xl font-black text-konecta-navy mb-2">{selectedEvent.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-konecta-gold text-[16px]">schedule</span>
                    <span>{new Date(selectedEvent.starts_at || selectedEvent.date).toLocaleString('pt-AO')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-konecta-gold text-[16px]">location_on</span>
                    <span>{selectedEvent.venue}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
              </div>

              {selectedEvent.agenda && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <h4 className="text-[10px] font-extrabold text-konecta-navy uppercase tracking-[0.2em]">{t('events.form_agenda')}</h4>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{selectedEvent.agenda}</p>
                </div>
              )}

              {selectedEvent.requirements && (
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 space-y-2">
                  <h4 className="text-[10px] font-extrabold text-amber-900 uppercase tracking-[0.2em]">{t('events.form_requirements')}</h4>
                  <p className="text-xs text-amber-800 whitespace-pre-wrap">{selectedEvent.requirements}</p>
                </div>
              )}

              {selectedEvent.certificate_available && (
                <div className="flex items-center gap-2 text-[10px] text-emerald-700 bg-emerald-50 px-4 py-3 rounded-2xl uppercase font-black tracking-wider">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">workspace_premium</span>
                  <span>{t('events.form_certificate')}</span>
                </div>
              )}

              {/* Organizer / Attendee Controls */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black text-konecta-navy block uppercase tracking-tighter">
                    {selectedEvent.participant_count || 0} / {selectedEvent.capacity || 100} {t('events.vagas')}
                  </span>
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">{t('library.by')} {selectedEvent.profiles?.full_name}</span>
                </div>

                <div className="flex items-center gap-3">
                  {selectedEvent.organizer_id === user?.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedEvent(null);
                          handleOpenEdit(selectedEvent);
                        }}
                        className="btn-primary py-2 px-4 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleCancelEvent(selectedEvent.id)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 py-2 px-4 rounded-xl text-xs font-bold"
                      >
                        Cancelar Evento
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleResponse(selectedEvent.id, selectedEvent.attendees?.some((a:any)=>a.user_id===user?.id && a.response==='going') ? 'not_going' : 'going')}
                      className={`btn-primary py-2.5 px-6 text-xs ${
                        selectedEvent.attendees?.some((a:any)=>a.user_id===user?.id && a.response==='going') ? 'bg-green-600' : ''
                      }`}
                    >
                      {selectedEvent.attendees?.some((a:any)=>a.user_id===user?.id && a.response==='going') ? 'Inscrito ✓' : 'Inscrever-me'}
                    </button>
                  )}
                </div>
              </div>

              {/* Attendees List preview */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-extrabold text-konecta-navy uppercase tracking-[0.2em] mb-3">{t('events.attendees_title')}</h4>
                {loadingAttendees ? (
                  <p className="text-xs text-gray-400 italic">{t('events.loading_attendees')}</p>
                ) : attendeesList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">{t('events.no_attendees')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {attendeesList.map((att: any) => (
                      <div key={att.user_id} className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-konecta-navy text-white text-[10px] font-bold flex items-center justify-center overflow-hidden">
                          {att.profiles?.avatar_url ? (
                            <img src={att.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (att.profiles?.full_name || 'U').charAt(0)
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{att.profiles?.full_name || 'Inovador'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create / Edit Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">
                  {editingEventId ? t('events.edit_modal_title') : t('events.create_modal_title')}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-konecta-navy">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_type')}</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <option value="event">{t('events.type_event')}</option>
                      <option value="workshop">{t('events.type_workshop')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_format')}</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium"
                    >
                      <option value="presencial">{t('events.format_presencial')}</option>
                      <option value="online">{t('events.format_online')}</option>
                      <option value="híbrido">{t('events.format_hybrid')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_title')}</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Workshop Prático de Inteligência Artificial para Negócios"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('create.detailed_desc')}</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('create.detailed_desc_placeholder')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_starts')}</label>
                    <input
                      type="datetime-local"
                      required
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_ends')}</label>
                    <input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_venue')}</label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="Ex: Mediateca de Luanda"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_capacity')}</label>
                    <input
                      type="number"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {format !== 'presencial' && (
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_online_url')}</label>
                    <input
                      type="url"
                      value={onlineUrl}
                      onChange={(e) => setOnlineUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('create.category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_agenda')}</label>
                  <textarea
                    rows={2}
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="09:00 - Abertura&#10;10:00 - Palestra Principal..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('events.form_requirements')}</label>
                  <input
                    type="text"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Ex: Trazer computador portátil"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="cert"
                    checked={certificateAvailable}
                    onChange={(e) => setCertificateAvailable(e.target.checked)}
                    className="w-4 h-4 text-konecta-gold rounded"
                  />
                  <label htmlFor="cert" className="text-xs font-bold text-konecta-navy cursor-pointer">
                    {t('events.form_certificate')}
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1">{t('create.cover_image')}</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-konecta-navy file:text-white hover:file:bg-konecta-navy/90"
                    />
                    {uploadingImage && <span className="text-xs text-konecta-gold font-bold">{t('common.loading')}</span>}
                  </div>
                  {coverPhotoUrl && (
                    <div className="mt-2 w-32 h-20 rounded-xl overflow-hidden border">
                      <img src={coverPhotoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !title.trim() || !description.trim() || !startsAt}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {saving ? t('events.saving') : editingEventId ? t('events.update_btn') : t('events.publish_btn')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
