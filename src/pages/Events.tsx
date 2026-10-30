import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, safeQuery, getFriendlyErrorMessage, isSchemaCacheError } from '../lib/supabase';
import { Event, EventParticipant } from '../types';

interface EventsProps {
  user: any;
  onOpenAuth: () => void;
}

export const Events: React.FC<EventsProps> = ({ user, onOpenAuth }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Participant tracking
  const [registeredMap, setRegisteredMap] = useState<Record<string, boolean>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Create Event Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [eventsRes, participantsRes] = await Promise.all([
        safeQuery<any>(() => supabase
          .from('events')
          .select('*, profiles(full_name, avatar_url)')
          .order('date', { ascending: true })),
        safeQuery<any>(() => supabase
          .from('event_participants')
          .select('event_id, user_id'))
      ]);

      if (eventsRes?.error && !isSchemaCacheError(eventsRes.error)) {
        throw eventsRes.error;
      }

      const evList = eventsRes?.data || [];
      setEvents(evList);

      const counts: Record<string, number> = {};
      const userRegistered: Record<string, boolean> = {};

      evList.forEach((e: any) => {
        counts[e.id] = 0;
      });

      participantsRes?.data?.forEach((p: any) => {
        if (counts[p.event_id] !== undefined) {
          counts[p.event_id] += 1;
        }
        if (user && p.user_id === user.id) {
          userRegistered[p.event_id] = true;
        }
      });

      setParticipantCounts(counts);
      setRegisteredMap(userRegistered);
      setError(null);
    } catch (err: any) {
      console.warn('Aviso ao carregar eventos:', err?.message || err);
      setError(getFriendlyErrorMessage(err, 'Não foi possível carregar os eventos de momento.'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRegistration = async (eventId: string) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const isRegistered = registeredMap[eventId];
    setActionLoading(prev => ({ ...prev, [eventId]: true }));

    // Optimistic UI update
    setRegisteredMap(prev => ({ ...prev, [eventId]: !isRegistered }));
    setParticipantCounts(prev => ({
      ...prev,
      [eventId]: isRegistered 
        ? Math.max(0, (prev[eventId] || 1) - 1) 
        : (prev[eventId] || 0) + 1
    }));

    try {
      if (isRegistered) {
        // Cancel registration
        await safeQuery<any>(() => supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id));
      } else {
        // Register
        await safeQuery<any>(() => supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: user.id
          }));
      }
    } catch (err: any) {
      console.warn('Aviso ao atualizar inscrição no evento:', err?.message || err);
    } finally {
      setActionLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!title.trim() || !description.trim() || !date || !location.trim() || creating) return;

    setCreating(true);
    try {
      const { data, error } = await safeQuery<any>(() => supabase.from('events').insert({
        title: title.trim(),
        description: description.trim(),
        date,
        location: location.trim(),
        organizer_id: user.id
      }).select('*, profiles(full_name, avatar_url)').single());

      if (error) {
        if (isSchemaCacheError(error)) {
          alert('A base de dados do Supabase está a sincronizar. Tenta novamente em instantes.');
          setCreating(false);
          return;
        }
        throw error;
      }

      // Automatically register organizer as participant
      await safeQuery<any>(() => supabase.from('event_participants').insert({
        event_id: data.id,
        user_id: user.id
      }));

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDate('');
      setLocation('');
      fetchEvents();
    } catch (err: any) {
      console.warn('Aviso ao criar evento:', err?.message || err);
      alert(getFriendlyErrorMessage(err, 'Erro ao criar evento.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      
      {/* Header */}
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="feature-kicker">Agenda & Encontros</span>
          <h1 className="hero-title">Eventos e Workshops</h1>
          <p className="text-gray-500 mt-3 max-w-2xl leading-relaxed">
            Descobre workshops, conferências, hackathons e encontros de inovação a acontecer nas várias províncias de Angola.
          </p>
        </div>
        <button 
          onClick={() => {
            if (!user) onOpenAuth();
            else setShowCreateModal(true);
          }}
          className="btn-gold whitespace-nowrap text-xs py-3.5 px-6 shadow-md self-start md:self-auto"
        >
          + Publicar Evento
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-konecta-navy"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-3xl text-center max-w-lg mx-auto border border-red-100">
          <p className="font-bold">Erro ao carregar eventos</p>
          <p className="text-sm mt-2">{error}</p>
          <button onClick={fetchEvents} className="mt-4 btn-primary py-2 text-xs">
            Tentar Novamente
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[32px] border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">event_busy</span>
          <p className="text-gray-500 font-medium">Ainda não existem eventos agendados no Supabase.</p>
          <p className="text-xs text-gray-400 mt-1">Organiza o primeiro workshop ou encontro para a tua comunidade.</p>
          <button 
            onClick={() => user ? setShowCreateModal(true) : onOpenAuth()}
            className="mt-6 btn-gold text-xs py-3 px-8"
          >
            Agendar Primeiro Evento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {events.map((event) => {
            const isRegistered = registeredMap[event.id];
            const pCount = participantCounts[event.id] || 0;
            const isLoading = actionLoading[event.id];

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-konecta flex flex-col md:flex-row gap-6 p-6 sm:p-8 overflow-hidden shadow-sm border border-gray-100 hover:border-konecta-gold/40 transition-all"
              >
                <div className="md:w-2/5 aspect-video md:aspect-auto rounded-2xl overflow-hidden bg-gradient-to-br from-konecta-navy/10 to-konecta-gold/10 flex items-center justify-center relative shrink-0">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <span className="material-symbols-outlined text-4xl text-konecta-gold mb-1 block">event</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-konecta-navy">KONECTA Evento</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1 text-center shadow-sm">
                    <span className="text-xs font-black text-konecta-navy block">
                      {new Date(event.date).getDate()}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-konecta-gold block -mt-1">
                      {new Date(event.date).toLocaleDateString('pt-AO', { month: 'short' })}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                      <span className="material-symbols-outlined text-[16px] text-konecta-gold">location_on</span>
                      <span className="font-semibold text-konecta-navy">{event.location}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-konecta-navy mb-2 leading-tight">
                      {event.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-3 mb-6 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-konecta-navy block">
                        {pCount} {pCount === 1 ? 'Inscrito' : 'Inscritos'}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        Por {event.profiles?.full_name || 'Organizador'}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleToggleRegistration(event.id)}
                      disabled={isLoading}
                      className={`btn-primary py-2 px-5 text-xs transition-all ${
                        isRegistered 
                          ? 'bg-green-600 hover:bg-red-500 text-white' 
                          : ''
                      }`}
                    >
                      {isLoading ? '...' : isRegistered ? 'Inscrito ✓' : 'Inscrever-me'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-konecta-navy/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-bold text-konecta-navy">Publicar Novo Evento</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-konecta-navy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Título do Evento
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Workshop de Energia Solar e Empreendedorismo"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                    Descrição e Agenda
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Informa os oradores, tópicos abordados, público-alvo e requisitos de participação..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Data e Hora
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-konecta-navy uppercase tracking-wider mb-1.5">
                      Local ou Link Online
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Mediateca de Luanda ou Online"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-konecta-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !title.trim() || !description.trim() || !date || !location.trim()}
                    className="btn-primary py-2.5 px-6 text-xs"
                  >
                    {creating ? 'A registar...' : 'Publicar Evento'}
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
