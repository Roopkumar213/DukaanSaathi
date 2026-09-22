import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

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
  sendTextCommand: (text: string, language?: string) => void;
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
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shopVocabulary, setShopVocabulary] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

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
    if (state === 'SPEAKING') {
      setState('LISTENING');
    }
  }, [state]);

  const disconnect = useCallback(() => {
    // Stop recording
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    interruptSpeaking();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState('DISCONNECTED');
  }, [interruptSpeaking]);

  const connect = useCallback(() => {
    if (!token) {
      setErrorMessage('Please login to connect to DukaanSaathi voice assistant.');
      setState('ERROR');
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setState('CONNECTING');
    setErrorMessage(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // Connect to Spring Boot backend WebSocket on port 8080
    const wsUrl = `${protocol}//${host}:8080/ws/voice-assistant?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
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
            // Play raw audio chunk (PCM base64 from Gemini Live)
            if (msg.data && !isMuted) {
              playBase64Audio(msg.data);
            }
            break;
        }
      } catch (err) {
        console.warn('Could not parse voice message:', err);
      }
    };

    ws.onerror = () => {
      setErrorMessage('Voice assistant connection lost. Retrying...');
      setState('ERROR');
    };

    ws.onclose = (ev) => {
      if (ev.code !== 1000) {
        setErrorMessage(ev.reason || 'Voice connection closed. Please reconnect.');
        setState('DISCONNECTED');
      }
    };
  }, [token, isMuted]);

  // Plays 24kHz raw PCM from Gemini Live via Web Audio API
  const playBase64Audio = (base64: string) => {
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
        if (audioQueueRef.current.length === 0 && state === 'SPEAKING') {
          setState('READY');
        }
      };
      audioQueueRef.current.push(source);
      source.start();
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  const startListening = useCallback(async () => {
    interruptSpeaking();
    setErrorMessage(null);
    setSaleSuccessMessage(null);

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
      // Process 16kHz PCM audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to Base64
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
      setState('ERROR');
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

  const sendTextCommand = useCallback((text: string, language = 'en') => {
    if (!text.trim()) return;
    interruptSpeaking();
    setErrorMessage(null);
    setSaleSuccessMessage(null);
    setTranscript(text);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text_query',
          text,
          language,
        })
      );
    } else {
      // Connect first then retry
      connect();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'text_query',
              text,
              language,
            })
          );
        }
      }, 500);
    }
  }, [connect, interruptSpeaking]);

  const confirmSale = useCallback((draftId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'confirm_sale',
          draftId,
        })
      );
    }
  }, []);

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

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
