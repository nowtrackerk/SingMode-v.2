
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { addChatMessage } from '../services/sessionManager';

interface ChatWidgetProps {
  senderId: string;
  senderName: string;
  messages: ChatMessage[];
  expandedInitially?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ senderId, senderName, messages, expandedInitially = false }) => {
  const [isOpen, setIsOpen] = useState(expandedInitially);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addChatMessage(senderId, senderName, inputText.trim());
    setInputText('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-2xl z-50 hover:scale-110 transition-transform active:scale-95"
      >
        💬
        {messages.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-fuchsia-500 rounded-full border-2 border-slate-950 animate-pulse"></span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-800 p-3 flex justify-between items-center border-b border-slate-700">
        <h3 className="font-bold text-sm text-indigo-400 uppercase tracking-widest">Live Chat</h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white p-1">✕</button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center text-slate-600 text-xs italic mt-8">No messages yet. Say hi!</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.senderId === senderId ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-slate-500 font-bold mb-1 px-1">{msg.senderName}</span>
            <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
              msg.senderId === senderId 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 bg-slate-950/50 flex gap-2 border-t border-slate-800">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button 
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
