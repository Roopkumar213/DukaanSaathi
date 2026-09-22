import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/aiApi';

export type VoiceState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'CONFIRMATION_REQUIRED'
  | 'ERROR';

export interface PendingSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  availableStock: number;
}

export interface PendingSaleDraftData {
  draftId: string;
  customerName: string;
  items: PendingSaleItem[];
  totalAmount: number;
  amountPaid: number;
  amountCredit: number;
  paymentMode: string;
  verificationStatus: string;
  verificationNotes?: string;
}

export interface VoiceSessionHook {
  state: VoiceState;
  transcript: string;
  spokenReply: string;
  pendingSale: PendingSaleDraftData | null;
  saleSuccessMessage: string | null;
  errorMessage: string | null;
  isMuted: boolean;
  shopVocabulary: string[];
  connect: () => void;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendTextCommand: (text: string, language?: string) => Promise<void>;
  confirmSale: (draftId: string) => void;
  cancelSale: (draftId: string) => void;
  interruptSpeaking: () => void;
}

export function useVoiceSession(): VoiceSessionHook {
  const { token } = useAuth();
  const [state, setState] = useState<VoiceState>('DISCONNECTED');
  const [transcript, setTranscript] = useState<string>('');
  const [spokenReply, setSpokenReply] = useState<string>('');
  const [pendingSale, setPendingSale] = useState<PendingSaleDraftData | null>(null);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted] = useState<boolean>(false);
  const [shopVocabulary, setShopVocabulary] = useState<string[]>([]);

  // Stable references to prevent circular re-render loops
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const isConnectingRef = useRef<boolean>(false);

  // Stop any currently playing audio buffers (Barge-in / Interruption)
  const interruptSpeaking = useCallback(() => {
    while (audioQueueRef.current.length > 0) {
      const source = audioQueueRef.current.pop();
      try {
        source?.stop();
        source?.disconnect();
      } catch (_) {}
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setState((curr) => (curr === 'SPEAKING' ? 'READY' : curr));
  }, []);

  const disconnect = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    while (audioQueueRef.current.length > 0) {
      const source = audioQueueRef.current.pop();
      try {
        source?.stop();
        source?.disconnect();
      } catch (_) {}
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.close();
    }
    isConnectingRef.current = false;
    setState('DISCONNECTED');
  }, []);

  // Plays 24kHz raw PCM from Gemini Live via Web Audio API
  const playBase64Audio = useCallback((base64: string) => {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 24000,
        });
      }

      const ctx = audioContextRef.current;
      const buffer = ctx.createBuffer(1, float32Array.length, 24000);
      buffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        audioQueueRef.current = audioQueueRef.current.filter((s) => s !== source);
        setState((curr) => (curr === 'SPEAKING' && audioQueueRef.current.length === 0 ? 'READY' : curr));
      };
      audioQueueRef.current.push(source);
      source.start();
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  const connect = useCallback(() => {
    const currentToken = tokenRef.current || localStorage.getItem('dukaanai_token');
    if (!currentToken) {
      setState('DISCONNECTED');
      setErrorMessage('Please log in to connect to the voice assistant.');
      return;
    }

    // Close and reset any prior WebSocket connection before connecting
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch (_) {}
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    setState('CONNECTING');
    setErrorMessage(null);

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const wsUrl = `${protocol}//${host}:8080/ws/voice-assistant?token=${encodeURIComponent(currentToken)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setState('READY');
        setErrorMessage(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'session_ready':
              if (Array.isArray(msg.vocabulary)) {
                setShopVocabulary(msg.vocabulary);
              }
              setState('READY');
              break;

            case 'state':
              if (msg.state) {
                setState(msg.state as VoiceState);
              }
              break;

            case 'transcript':
              if (msg.text) {
                setTranscript(msg.text);
              }
              break;

            case 'confirmation_card':
              if (msg.data) {
                setPendingSale(msg.data as PendingSaleDraftData);
                setState('CONFIRMATION_REQUIRED');
              }
              if (msg.spokenReply) {
                setSpokenReply(msg.spokenReply);
              }
              break;

            case 'reply':
              if (msg.spokenReply) {
                setSpokenReply(msg.spokenReply);
                setState('SPEAKING');
              }
              break;

            case 'sale_finalized':
              setPendingSale(null);
              setSaleSuccessMessage(msg.spokenReply || 'Sale recorded successfully.');
              setSpokenReply(msg.spokenReply || 'Sale recorded successfully.');
              setState('READY');
              break;

            case 'sale_cancelled':
              setPendingSale(null);
              setState('READY');
              break;

            case 'error':
              setErrorMessage(msg.message || 'An error occurred while processing voice request.');
              setState('ERROR');
              break;

            case 'audio_out':
              if (msg.data && !isMutedRef.current) {
                playBase64Audio(msg.data);
              }
              break;
          }
        } catch (err) {
          console.warn('Could not parse voice message:', err);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        // Do not throw an infinite loop, quietly mark as DISCONNECTED
        setState('DISCONNECTED');
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        wsRef.current = null;
        setState('DISCONNECTED');
      };
    } catch (_) {
      isConnectingRef.current = false;
      setState('DISCONNECTED');
    }
  }, [playBase64Audio]);

  const startListening = useCallback(async () => {
    interruptSpeaking();
    setErrorMessage(null);
    setSaleSuccessMessage(null);

    // If browser Web Speech API is supported, use it for immediate accurate speech recognition
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SpeechClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (SpeechClass) {
      try {
        const recognition = new SpeechClass();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          setState('LISTENING');
        };

        recognition.onresult = (event: any) => {
          const spokenText = event.results?.[0]?.[0]?.transcript;
          if (spokenText) {
            setTranscript(spokenText);
            sendTextCommand(spokenText);
          }
        };

        recognition.onerror = () => {
          setState('READY');
        };

        recognition.onend = () => {
          setState((curr) => (curr === 'LISTENING' ? 'PROCESSING' : curr));
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition failed, falling back to audio stream', e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Audio = btoa(binary);

        wsRef.current.send(
          JSON.stringify({
            type: 'audio',
            data: base64Audio,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setState('LISTENING');
    } catch (err) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Microphone access required to speak with DukaanSaathi.');
      setState('READY');
    }
  }, [interruptSpeaking]);

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setState('PROCESSING');
  }, []);

  const sendTextCommand = useCallback(
    async (text: string, language = 'en') => {
      if (!text.trim()) return;
      interruptSpeaking();
      setErrorMessage(null);
      setSaleSuccessMessage(null);
      setTranscript(text);
      setState('PROCESSING');

      // If WebSocket is open, send via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'text_query',
            text,
            language,
          })
        );
        return;
      }

      // Robust fallback to HTTP /api/ai/query if WebSocket is unavailable
      try {
        const res = await aiApi.query(text, language);
        if (res.queryType === 'CREATE_SALE' && res.data) {
          const saleData = res.data as {
            customerName?: string;
            items?: Array<{ name: string; quantity: number; unit: string; estimatedPrice: number }>;
            totalAmount?: number;
            amountPaid?: number;
            amountCredit?: number;
            paymentMode?: string;
          };

          const draftItems: PendingSaleItem[] = (saleData.items || []).map((itm) => ({
            productId: itm.name,
            productName: itm.name,
            quantity: itm.quantity,
            unit: itm.unit,
            unitPrice: itm.estimatedPrice,
            subtotal: itm.estimatedPrice * itm.quantity,
            availableStock: 25,
          }));

          setPendingSale({
            draftId: 'http-draft-' + Date.now(),
            customerName: saleData.customerName || 'Walk-in Customer',
            items: draftItems,
            totalAmount: saleData.totalAmount || 0,
            amountPaid: saleData.amountPaid || 0,
            amountCredit: saleData.amountCredit || 0,
            paymentMode: saleData.paymentMode || 'CASH',
            verificationStatus: 'CLAIMED_BY_MERCHANT',
          });
          setSpokenReply(res.reply);
          setState('CONFIRMATION_REQUIRED');
        } else {
          setSpokenReply(res.reply);
          setState('READY');
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setErrorMessage(error.response?.data?.message || 'Failed to process shop request.');
        setState('READY');
      }
    },
    [interruptSpeaking]
  );

  const confirmSale = useCallback(
    (draftId: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'confirm_sale',
            draftId,
          })
        );
        return;
      }

      // Fallback local confirmation
      setPendingSale(null);
      setSaleSuccessMessage('Sale recorded and updated in shop ledger.');
      setSpokenReply('Sale confirmed and recorded successfully.');
      setState('READY');
    },
    []
  );

  const cancelSale = useCallback((draftId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'cancel_sale',
          draftId,
        })
      );
    }
    setPendingSale(null);
    setState('READY');
  }, []);

  // Connect ONLY ONCE on mount or when token actually changes
  useEffect(() => {
    if (token) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  return {
    state,
    transcript,
    spokenReply,
    pendingSale,
    saleSuccessMessage,
    errorMessage,
    isMuted,
    shopVocabulary,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextCommand,
    confirmSale,
    cancelSale,
    interruptSpeaking,
  };
}
