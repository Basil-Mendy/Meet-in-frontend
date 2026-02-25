import React, { createContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

// SocketContext provides a single persistent Socket.IO connection
// Usage: Wrap app with <SocketProvider>{...}</SocketProvider>

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const handlersRef = useRef({}); // eventName -> Set of callbacks

    const backendSocketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    const addHandler = useCallback((event, cb) => {
        if (!handlersRef.current[event]) handlersRef.current[event] = new Set();
        handlersRef.current[event].add(cb);
        return () => handlersRef.current[event].delete(cb);
    }, []);

    const emit = useCallback((event, payload) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(event, payload);
        }
    }, []);

    const joinRoom = useCallback((room) => {
        emit('join_room', { room });
    }, [emit]);

    const leaveRoom = useCallback((room) => {
        emit('leave_room', { room });
    }, [emit]);

    useEffect(() => {
        const token = localStorage.getItem('access');
        if (!token) return;

        // Create socket with auto-reconnect
        const socket = io(backendSocketUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        // Wire-up default events
        const forward = (eventName) => (payload) => {
            const setOfHandlers = handlersRef.current[eventName];
            if (setOfHandlers) setOfHandlers.forEach(cb => cb(payload));
        };

        const events = ['new_post', 'new_comment', 'new_message', 'notification_update', 'user_online', 'user_offline'];
        events.forEach(evt => socket.on(evt, forward(evt)));

        // Provide raw message handler
        socket.on('connect_error', (err) => {
            console.warn('Socket connect_error', err.message || err);
        });

        return () => {
            try {
                events.forEach(evt => socket.off(evt));
                socket.disconnect();
            } catch (e) {
                // ignore
            }
        };
    }, [backendSocketUrl]);

    const value = {
        socket: socketRef.current,
        connected,
        emit,
        joinRoom,
        leaveRoom,
        addHandler,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const ctx = React.useContext(SocketContext);
    if (!ctx) throw new Error('useSocket must be used within SocketProvider');
    return ctx;
}
