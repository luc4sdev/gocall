'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/toast';
import { playSound } from '@/lib/utils';
import type { ChannelDTO } from '@/lib/types';
import type { CallSignalPayload, SendCallSignal } from './CallSignalBridge';

export type PrivateCallStatus = 'outgoing' | 'incoming' | 'active';

export interface PrivateCallState {
    status: PrivateCallStatus;
    callId: string;
    peerId: string;
    peerName: string;
    roomName: string;
}

const RING_TIMEOUT_MS = 30_000;
const INCOMING_RING_INTERVAL_MS = 2_500;
const OUTGOING_RING_INTERVAL_MS = 3_000;

const PRIVATE_CALL_CHANNEL_PREFIX = 'dm-call:';

export function privateCallChannelId(callId: string) {
    return `${PRIVATE_CALL_CHANNEL_PREFIX}${callId}`;
}

export function isPrivateCallChannelId(channelId: string | null | undefined): boolean {
    return !!channelId && channelId.startsWith(PRIVATE_CALL_CHANNEL_PREFIX);
}

interface UsePrivateCallParams {
    localIdentity: string;
    username: string;
    voiceChannelRef: RefObject<ChannelDTO | null>;
    friendIdsRef: RefObject<Set<string>>;
    onJoinVoice: (channel: ChannelDTO) => Promise<boolean>;
    onLeaveVoice: () => void;
}

export function usePrivateCall({ localIdentity, username, voiceChannelRef, friendIdsRef, onJoinVoice, onLeaveVoice }: UsePrivateCallParams) {
    const router = useRouter();
    const [privateCall, setPrivateCall] = useState<PrivateCallState | null>(null);
    const privateCallRef = useRef<PrivateCallState | null>(null);
    useEffect(() => {
        privateCallRef.current = privateCall;
    }, [privateCall]);

    const sendSignalRef = useRef<SendCallSignal | null>(null);
    const handleCallSignalReady = useCallback((send: SendCallSignal) => {
        sendSignalRef.current = send;
    }, []);

    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearRingTimeout = useCallback(() => {
        if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
        }
    }, []);
    useEffect(() => clearRingTimeout, [clearRingTimeout]);

    // Toque repetido enquanto uma chamada está tocando pra quem recebeu.
    const incomingRingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stopIncomingRing = useCallback(() => {
        if (incomingRingIntervalRef.current) {
            clearInterval(incomingRingIntervalRef.current);
            incomingRingIntervalRef.current = null;
        }
    }, []);
    useEffect(() => stopIncomingRing, [stopIncomingRing]);

    const outgoingRingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stopOutgoingRing = useCallback(() => {
        if (outgoingRingIntervalRef.current) {
            clearInterval(outgoingRingIntervalRef.current);
            outgoingRingIntervalRef.current = null;
        }
    }, []);
    useEffect(() => stopOutgoingRing, [stopOutgoingRing]);

    const replacedPrivateCallRef = useRef<{ callId: string; peerId: string } | null>(null);

    const startPrivateCall = useCallback((friend: { id: string; username: string }) => {
        if (voiceChannelRef.current || privateCallRef.current) {
            notify.error('Você já está em uma chamada.');
            return;
        }

        const callId = crypto.randomUUID();
        const roomName = privateCallChannelId(callId);
        setPrivateCall({ status: 'outgoing', callId, peerId: friend.id, peerName: friend.username, roomName });

        sendSignalRef.current?.({ signal: 'invite', callId, fromId: localIdentity, fromName: username, toId: friend.id, roomName });

        stopOutgoingRing();
        playSound('call-ringback');
        outgoingRingIntervalRef.current = setInterval(() => playSound('call-ringback'), OUTGOING_RING_INTERVAL_MS);

        clearRingTimeout();
        ringTimeoutRef.current = setTimeout(() => {
            const current = privateCallRef.current;
            if (current?.callId === callId && current.status === 'outgoing') {
                stopOutgoingRing();
                sendSignalRef.current?.({ signal: 'timeout', callId, fromId: localIdentity, fromName: username, toId: friend.id });
                setPrivateCall(null);
                notify.info(`${friend.username} não atendeu.`);
            }
        }, RING_TIMEOUT_MS);
    }, [voiceChannelRef, localIdentity, username, clearRingTimeout, stopOutgoingRing]);

    const declinePrivateCall = useCallback(() => {
        const current = privateCallRef.current;
        if (!current) return;
        clearRingTimeout();
        stopIncomingRing();
        stopOutgoingRing();
        replacedPrivateCallRef.current = null;
        sendSignalRef.current?.({
            signal: current.status === 'incoming' ? 'decline' : 'cancel',
            callId: current.callId,
            fromId: localIdentity,
            fromName: username,
            toId: current.peerId,
        });
        setPrivateCall(null);
    }, [localIdentity, username, clearRingTimeout, stopIncomingRing, stopOutgoingRing]);

    const acceptPrivateCall = useCallback(async () => {
        const current = privateCallRef.current;
        if (!current || current.status !== 'incoming') return;
        clearRingTimeout();
        stopIncomingRing();

        const replaced = replacedPrivateCallRef.current;
        replacedPrivateCallRef.current = null;
        if (voiceChannelRef.current) {
            if (replaced) {
                sendSignalRef.current?.({ signal: 'end', callId: replaced.callId, fromId: localIdentity, fromName: username, toId: replaced.peerId });
            }
            onLeaveVoice();
        }

        const joined = await onJoinVoice({
            id: privateCallChannelId(current.callId),
            name: current.peerName,
            type: 'VOICE',
            roomName: current.roomName,
            canDelete: false,
            serverId: '',
        });

        if (privateCallRef.current?.callId !== current.callId) {
            if (joined) onLeaveVoice();
            return;
        }

        if (!joined) {
            notify.error('Não foi possível entrar na chamada.');
            sendSignalRef.current?.({ signal: 'decline', callId: current.callId, fromId: localIdentity, fromName: username, toId: current.peerId });
            setPrivateCall(null);
            return;
        }

        sendSignalRef.current?.({ signal: 'accept', callId: current.callId, fromId: localIdentity, fromName: username, toId: current.peerId });
        setPrivateCall({ ...current, status: 'active' });
        router.push(`/friends/${current.peerId}`);
    }, [onJoinVoice, onLeaveVoice, voiceChannelRef, localIdentity, username, router, clearRingTimeout, stopIncomingRing]);

    const handleLeaveVoiceUnified = useCallback(() => {
        const current = privateCallRef.current;
        if (current?.status === 'active') {
            sendSignalRef.current?.({ signal: 'end', callId: current.callId, fromId: localIdentity, fromName: username, toId: current.peerId });
            setPrivateCall(null);
        }
        onLeaveVoice();
    }, [localIdentity, username, onLeaveVoice]);

    const handleCallSignal = useCallback((payload: CallSignalPayload) => {
        if (payload.toId !== localIdentity) return;
        const current = privateCallRef.current;

        switch (payload.signal) {
            case 'invite': {
                if (!friendIdsRef.current.has(payload.fromId)) return;
                if (current && current.status !== 'active') {
                    sendSignalRef.current?.({ signal: 'busy', callId: payload.callId, fromId: localIdentity, fromName: username, toId: payload.fromId });
                    return;
                }
                replacedPrivateCallRef.current = current?.status === 'active'
                    ? { callId: current.callId, peerId: current.peerId }
                    : null;
                setPrivateCall({
                    status: 'incoming',
                    callId: payload.callId,
                    peerId: payload.fromId,
                    peerName: payload.fromName,
                    roomName: payload.roomName ?? privateCallChannelId(payload.callId),
                });
                stopIncomingRing();
                playSound('call-ring');
                incomingRingIntervalRef.current = setInterval(() => playSound('call-ring'), INCOMING_RING_INTERVAL_MS);
                break;
            }
            case 'accept': {
                if (current?.callId !== payload.callId || current.status !== 'outgoing') return;
                clearRingTimeout();
                stopOutgoingRing();
                (async () => {
                    const joined = await onJoinVoice({
                        id: privateCallChannelId(current.callId),
                        name: current.peerName,
                        type: 'VOICE',
                        roomName: current.roomName,
                        canDelete: false,
                        serverId: '',
                    });

                    if (privateCallRef.current?.callId !== current.callId) {
                        if (joined) onLeaveVoice();
                        return;
                    }

                    if (joined) {
                        setPrivateCall({ ...current, status: 'active' });
                        router.push(`/friends/${current.peerId}`);
                    } else {
                        notify.error('Não foi possível entrar na chamada.');
                        setPrivateCall(null);
                    }
                })();
                break;
            }
            case 'decline': {
                if (current?.callId !== payload.callId) return;
                clearRingTimeout();
                stopOutgoingRing();
                setPrivateCall(null);
                notify.info(`${current.peerName} recusou a chamada.`);
                break;
            }
            case 'busy': {
                if (current?.callId !== payload.callId) return;
                clearRingTimeout();
                stopOutgoingRing();
                setPrivateCall(null);
                notify.info(`${current.peerName} está ocupado(a).`);
                break;
            }
            case 'cancel': {
                if (current?.callId !== payload.callId) return;
                stopIncomingRing();
                replacedPrivateCallRef.current = null;
                setPrivateCall(null);
                break;
            }
            case 'timeout': {
                if (current?.callId !== payload.callId) return;
                stopIncomingRing();
                replacedPrivateCallRef.current = null;
                setPrivateCall(null);
                notify.info('Chamada perdida.');
                break;
            }
            case 'end': {
                if (current?.callId !== payload.callId) return;
                setPrivateCall(null);
                onLeaveVoice();
                break;
            }
        }
    }, [localIdentity, username, friendIdsRef, onJoinVoice, onLeaveVoice, router, clearRingTimeout, stopIncomingRing, stopOutgoingRing]);

    return {
        privateCall,
        startPrivateCall,
        acceptPrivateCall,
        declinePrivateCall,
        handleCallSignalReady,
        handleCallSignal,
        handleLeaveVoiceUnified,
    };
}
