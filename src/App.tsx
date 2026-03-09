import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Mic, 
  Image as ImageIcon, 
  Paperclip, 
  MoreVertical, 
  ArrowLeft, 
  CheckCheck,
  Play,
  Pause,
  X,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Bell,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Lightbulb,
  PlusCircle,
  MinusCircle,
  Eye,
  Camera,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processFinanceMessage, generateAudioResponse } from './services/gemini';
import { cn } from './lib/utils';
import { IncomeIcon, ExpenseIcon, TransactionIncomeIcon, TransactionExpenseIcon } from './components/FinanceIcons';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  image?: string;
  audio?: string;
  isAudio?: boolean;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
}

type Tab = 'dashboard' | 'chat' | 'transactions';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou o Finance X. Como posso ajudar na sua gestão financeira hoje? 📈',
      sender: 'ai',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ total_income: 0, total_expense: 0 });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [messages, activeTab]);

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data || { total_income: 0, total_expense: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAudio = (msgId: string, audioSrc: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(audioSrc);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const handleSend = async (text: string = inputText, image: string | null = selectedImage) => {
    if (!text.trim() && !image) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
      image: image || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      const result = await processFinanceMessage(text, image || undefined);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: result.reply,
        sender: 'ai',
        timestamp: new Date(),
      };

      if (result.transaction) {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...result.transaction,
            raw_message: text
          })
        });
        fetchTransactions();
        fetchStats();
      }

      const audioBase64 = await generateAudioResponse(result.reply);
      if (audioBase64) {
        aiMessage.audio = `data:audio/wav;base64,${audioBase64}`;
      }

      setMessages(prev => [...prev, aiMessage]);
      
      if (aiMessage.audio) {
        toggleAudio(aiMessage.id, aiMessage.audio);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        sender: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      handleSend("Lançar um gasto de 50 reais com almoço hoje");
    }, 3000);
  };

  const handleQuickAction = (type: 'income' | 'expense' | 'tips' | 'balance' | 'scan' | 'voice' | 'report') => {
    if (type === 'tips') {
      setActiveTab('chat');
      handleSend("Me dê 3 dicas personalizadas de como economizar dinheiro hoje com base no meu perfil.");
    } else if (type === 'income') {
      setActiveTab('chat');
      setInputText("Recebi R$ ");
    } else if (type === 'expense') {
      setActiveTab('chat');
      setInputText("Gastei R$ ");
    } else if (type === 'balance') {
      setActiveTab('transactions');
    } else if (type === 'scan') {
      setActiveTab('chat');
      fileInputRef.current?.click();
    } else if (type === 'voice') {
      setActiveTab('chat');
      startRecording();
    } else if (type === 'report') {
      window.open('/api/report/weekly', '_blank');
    }
  };

  const Dashboard = () => (
    <div className="p-6 space-y-6 overflow-y-auto h-full pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold gold-text">Finance X</h1>
          <p className="text-slate-400 text-sm">Controle total da sua vida financeira.</p>
        </div>
        <div className="flex gap-3">
          <button className="p-2 glass-card hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-gold" />
          </button>
          <button className="p-2 glass-card hover:bg-white/10 transition-colors">
            <Settings className="w-5 h-5 text-gold" />
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="glass-card p-6 gold-gradient text-black relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-70 mb-1">Saldo Total</p>
          <h2 className="text-4xl font-bold mb-6">R$ {(stats.total_income - stats.total_expense).toFixed(2)}</h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm font-bold">R$ {stats.total_income.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full">
              <ArrowDownLeft className="w-4 h-4" />
              <span className="text-sm font-bold">R$ {stats.total_expense.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleQuickAction('income')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Adicionar</span>
            <span className="font-bold text-sm">Renda</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('expense')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
            <MinusCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Lançar</span>
            <span className="font-bold text-sm">Gasto</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('balance')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Ver</span>
            <span className="font-bold text-sm">O que restou</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('tips')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Dicas IA</span>
            <span className="font-bold text-sm">Economizar</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('scan')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Scan className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Escanear</span>
            <span className="font-bold text-sm">Contas/Cupons</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('voice')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Lançar por</span>
            <span className="font-bold text-sm">Voz (Áudio)</span>
          </div>
        </button>

        <button 
          onClick={() => handleQuickAction('report')}
          className="glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-all text-left col-span-2"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Gerar</span>
            <span className="font-bold text-sm">Planilha Semanal (.CSV)</span>
          </div>
        </button>
      </div>

      {/* Recent Transactions */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Transações Recentes</h3>
          <button onClick={() => setActiveTab('transactions')} className="text-gold text-sm font-medium">Ver tudo</button>
        </div>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((t) => (
            <div key={t.id} className="glass-card p-4 flex items-center gap-4">
              {t.type === 'income' ? <TransactionIncomeIcon className="bg-emerald-500/20 text-emerald-400" /> : <TransactionExpenseIcon className="bg-rose-500/20 text-rose-400" />}
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{t.description}</h4>
                <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
              </div>
              <div className={cn("font-bold text-sm", t.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-full relative">
      <header className="p-6 border-b border-white/10 flex items-center gap-4">
        <button onClick={() => setActiveTab('dashboard')} className="p-2 glass-card">
          <ArrowLeft className="w-5 h-5 text-gold" />
        </button>
        <div>
          <h2 className="font-bold text-lg">Assistente Finance X</h2>
          <p className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            IA Ativa
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                msg.sender === 'user' ? 'message-user' : 'message-ai'
              )}
            >
              {msg.image && (
                <img 
                  src={msg.image} 
                  alt="Upload" 
                  className="rounded-xl mb-3 max-w-full h-auto border border-white/10"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="flex items-start gap-3">
                {msg.audio && (
                  <button 
                    onClick={() => toggleAudio(msg.id, msg.audio!)}
                    className={cn(
                      "mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all",
                      msg.sender === 'user' ? 'bg-black/20 text-black' : 'bg-gold text-black'
                    )}
                  >
                    {playingAudioId === msg.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap flex-1">{msg.text}</p>
              </div>
              <p className="text-[10px] opacity-50 mt-2 text-right">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        {isProcessing && (
          <div className="message-ai italic text-sm opacity-50 animate-pulse">
            Finance X está analisando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-6 pt-2">
        <div className="glass-card p-2 flex items-end gap-2">
          <div className="flex-1 flex items-center px-4 py-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-gold transition-colors"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pergunte ou lance um gasto..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button 
            onClick={() => inputText.trim() || selectedImage ? handleSend() : startRecording()}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-black shadow-lg transition-all",
              isRecording ? "bg-red-500 scale-110" : "gold-gradient active:scale-95"
            )}
          >
            {inputText.trim() || selectedImage ? <Send className="w-5 h-5" /> : <Mic className={cn("w-5 h-5", isRecording && "animate-pulse")} />}
          </button>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative overflow-hidden shadow-2xl bg-black">
      <div className="app-background" />
      
      <main className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'transactions' && (
          <div className="p-6 space-y-6 overflow-y-auto h-full pb-24">
            <header className="flex items-center gap-4">
              <button onClick={() => setActiveTab('dashboard')} className="p-2 glass-card">
                <ArrowLeft className="w-5 h-5 text-gold" />
              </button>
              <h2 className="font-bold text-xl">Todas as Transações</h2>
            </header>
            <div className="space-y-3">
              {transactions.map((t) => (
                <div key={t.id} className="glass-card p-4 flex items-center gap-4">
                  {t.type === 'income' ? <TransactionIncomeIcon className="bg-emerald-500/20 text-emerald-400" /> : <TransactionExpenseIcon className="bg-rose-500/20 text-rose-400" />}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{t.description}</h4>
                    <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                  </div>
                  <div className={cn("font-bold text-sm", t.type === 'income' ? 'text-emerald-400' : 'text-rose-400')}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="absolute bottom-6 left-6 right-6 h-16 glass-card flex items-center justify-around px-2 z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'chat', icon: MessageSquare, label: 'IA Chat' },
          { id: 'transactions', icon: FileSpreadsheet, label: 'History' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
              activeTab === item.id ? "bg-gold text-black shadow-lg shadow-gold/20" : "text-slate-400 hover:text-white"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Image Preview Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-24 left-6 right-6 glass-card p-2 z-50"
          >
            <div className="relative">
              <img src={selectedImage} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
