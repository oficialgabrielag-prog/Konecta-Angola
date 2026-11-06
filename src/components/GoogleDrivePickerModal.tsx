import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Image,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  X,
  FileCheck2,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import {
  googleSignIn,
  getAccessToken,
  logout,
  listDriveDocuments,
  downloadOrExportDriveFile,
  createPicker,
  initAuth,
  DriveFileItem
} from '../lib/googleDrive';
import { uploadMediaToCloudinary } from '../lib/cloudinary';
import { useToast } from '../context/UIContext';
import { useT } from '../i18n/LanguageContext';

export interface SelectedDocumentResult {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  sizeFormatted?: string;
  driveUrl?: string;
  cloudinaryUrl?: string;
  file?: File;
  blob?: Blob;
}

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument: (doc: SelectedDocumentResult) => void;
  title?: string;
  allowedMimeTypes?: 'all' | 'documents_only' | 'identity_only';
  uploadToCloudinaryDirectly?: boolean;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDocument,
  title = 'Selecionar do Google Drive',
  allowedMimeTypes = 'all',
  uploadToCloudinaryDirectly = true
}) => {
  const { showToast } = useToast();
  const { t } = useT();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'image'>(
    allowedMimeTypes === 'identity_only' ? 'pdf' : 'all'
  );
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Check auth state on mount
  useEffect(() => {
    if (!isOpen) return;

    initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        fetchFiles(token);
      },
      () => {
        // Not authenticated
        getAccessToken().then(tok => {
          if (tok) {
            setAccessToken(tok);
            fetchFiles(tok);
          } else {
            setAccessToken(null);
            setFiles([]);
          }
        });
      }
    );
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        setGoogleUser(res.user);
        showToast('Conta Google conectada com sucesso!', 'success');
        fetchFiles(res.accessToken);
      }
    } catch (err: any) {
      console.error('Falha ao autenticar Google Drive:', err);
      showToast(err?.message || 'Falha na autenticação Google.', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAccessToken(null);
      setGoogleUser(null);
      setFiles([]);
      setSelectedFile(null);
      showToast('Sessão Google terminada.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiles = async (token?: string, search?: string, filter?: 'all' | 'pdf' | 'doc' | 'sheet' | 'slide' | 'image') => {
    const curToken = token || accessToken;
    if (!curToken) return;

    setLoadingFiles(true);
    try {
      const currentFilter = filter !== undefined ? filter : activeFilter;
      const currentSearch = search !== undefined ? search : searchQuery;

      const driveFiles = await listDriveDocuments(curToken, {
        search: currentSearch,
        filterType: currentFilter,
        pageSize: 35
      });
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Erro ao listar ficheiros do Drive:', err);
      if (err?.message?.includes('401') || err?.message?.includes('auth')) {
        setAccessToken(null);
      }
      showToast(err?.message || 'Erro ao aceder aos ficheiros do Drive.', 'error');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleNativePicker = async () => {
    if (!accessToken) return;

    try {
      createPicker(
        accessToken,
        {
          title: 'Google Drive - KONECTA',
          mimeTypes: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,text/plain'
        },
        async (data: any) => {
          if (data.action === 'picked') {
            const pickedDoc = data.docs[0];
            const fileItem: DriveFileItem = {
              id: pickedDoc.id,
              name: pickedDoc.name,
              mimeType: pickedDoc.mimeType,
              size: pickedDoc.sizeBytes?.toString(),
              webViewLink: pickedDoc.url || pickedDoc.embedUrl
            };
            setSelectedFile(fileItem);
            handleConfirmSelection(fileItem);
          }
        }
      );
    } catch (err: any) {
      console.error('Erro ao abrir picker nativo:', err);
      showToast('Não foi possível abrir o seletor nativo da Google.', 'error');
    }
  };

  const handleConfirmSelection = async (fileToProcess?: DriveFileItem) => {
    const file = fileToProcess || selectedFile;
    if (!file || !accessToken) return;

    setIsProcessing(true);
    setProcessingStatus('A descarregar do Google Drive...');

    try {
      // 1. Download or convert Drive file to Blob
      const { blob, mimeType, fileName } = await downloadOrExportDriveFile(file, accessToken);

      const standardFile = new File([blob], fileName, { type: mimeType });
      const sizeBytes = blob.size;
      const sizeFormatted = (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB';

      let cloudinaryUrl: string | undefined = undefined;

      // 2. Upload to Cloudinary if requested for permanent public storage
      if (uploadToCloudinaryDirectly) {
        setProcessingStatus('A carregar ficheiro com segurança...');
        const uploadResult = await uploadMediaToCloudinary(standardFile, undefined, {
          kind: 'document',
          alt: fileName
        });
        cloudinaryUrl = uploadResult.secure_url;
      }

      const result: SelectedDocumentResult = {
        id: file.id,
        name: fileName,
        mimeType: mimeType,
        size: sizeBytes,
        sizeFormatted: sizeFormatted,
        driveUrl: file.webViewLink,
        cloudinaryUrl: cloudinaryUrl,
        file: standardFile,
        blob: blob
      };

      showToast(`Documento "${fileName}" selecionado!`, 'success');
      onSelectDocument(result);
      onClose();
    } catch (err: any) {
      console.error('Falha ao processar ficheiro do Google Drive:', err);
      showToast(err?.message || 'Falha ao processar documento do Drive.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (mimeType.includes('document') || mimeType.includes('word')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileCode className="w-5 h-5 text-amber-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <Image className="w-5 h-5 text-purple-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return 'Google Doc';
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-konecta-navy/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-konecta-navy/5 flex items-center justify-center text-konecta-navy">
                <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-konecta-navy">{title}</h3>
                <p className="text-xs text-gray-500">Aceda aos seus documentos com autorização do Google Drive</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full text-gray-400 hover:text-konecta-navy hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!accessToken ? (
              /* Not Signed In State */
              <div className="text-center py-10 px-4 space-y-6">
                <div className="w-16 h-16 rounded-full bg-konecta-navy/5 mx-auto flex items-center justify-center text-konecta-navy">
                  <FolderOpen className="w-8 h-8 text-konecta-navy" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="font-bold text-lg text-konecta-navy">Ligar ao Google Drive</h4>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    Permita o acesso seguro aos seus ficheiros no Google Drive para enviar documentos, relatórios, contratos ou comprovativos diretamente na plataforma.
                  </p>
                </div>

                {/* Official Sign in with Google Button per Workspace skill rules */}
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleSignIn}
                    disabled={isAuthenticating}
                    className="flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all text-sm disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{isAuthenticating ? 'A conectar...' : 'Iniciar sessão com Google'}</span>
                  </button>
                </div>

                <div className="pt-4 text-xs text-gray-400">
                  Os seus ficheiros permanecem privados e só são acedidos mediante a sua seleção.
                </div>
              </div>
            ) : (
              /* Signed In File Explorer */
              <div className="space-y-4">
                {/* Account info bar */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200/70 rounded-2xl px-3.5 py-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-semibold text-konecta-navy truncate">
                      Google Drive Conectado {googleUser?.email ? `(${googleUser.email})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleNativePicker}
                      className="text-xs font-semibold text-konecta-navy hover:underline flex items-center gap-1"
                      title="Seletor Nativo do Google"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Seletor Nativo</span>
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-gray-500 hover:text-red-600 font-medium"
                    >
                      Desconectar
                    </button>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        fetchFiles(accessToken, e.target.value, activeFilter);
                      }}
                      placeholder="Pesquisar nos documentos do Drive..."
                      className="w-full bg-gray-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-konecta-navy placeholder:text-gray-400 focus:ring-2 focus:ring-konecta-navy outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          fetchFiles(accessToken, '', activeFilter);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide text-xs">
                    {[
                      { key: 'all', label: 'Todos' },
                      { key: 'pdf', label: 'PDFs' },
                      { key: 'doc', label: 'Documentos' },
                      { key: 'sheet', label: 'Folhas' },
                      { key: 'slide', label: 'Apresentações' },
                      { key: 'image', label: 'Imagens' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => {
                          const newF = f.key as any;
                          setActiveFilter(newF);
                          fetchFiles(accessToken, searchQuery, newF);
                        }}
                        className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                          activeFilter === f.key
                            ? 'bg-konecta-navy text-white font-semibold'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* File List */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 min-h-[220px] max-h-[320px] overflow-y-auto">
                  {loadingFiles ? (
                    <div className="py-14 text-center space-y-3">
                      <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-konecta-navy mx-auto"></div>
                      <p className="text-xs text-gray-500">A carregar documentos do Google Drive...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="py-14 text-center space-y-2">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                      <p className="text-xs font-semibold text-gray-600">Nenhum documento encontrado</p>
                      <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                        Tente alterar o filtro ou carregar ficheiros para a sua conta Google Drive.
                      </p>
                      <button
                        onClick={handleNativePicker}
                        className="mt-2 text-xs font-bold text-konecta-navy underline"
                      >
                        Tentar abrir o seletor nativo do Google
                      </button>
                    </div>
                  ) : (
                    files.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-konecta-navy/5 border-l-4 border-konecta-navy' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-xs sm:text-sm text-konecta-navy truncate">
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <span>{formatFileSize(file.size)}</span>
                                {file.modifiedTime && (
                                  <>
                                    <span>•</span>
                                    <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-konecta-navy" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-gray-300" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Processing status banner */}
                {isProcessing && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent shrink-0"></div>
                    <span className="font-medium">{processingStatus || 'A preparar ficheiro...'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-4 py-2"
            >
              Cancelar
            </button>

            {accessToken && (
              <button
                type="button"
                onClick={() => handleConfirmSelection()}
                disabled={!selectedFile || isProcessing}
                className="btn-primary py-2.5 px-6 text-xs rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                    <span>A processar...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-4 h-4" />
                    <span>Confirmar Documento</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
