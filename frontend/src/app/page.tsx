"use client";

import { useState, useEffect } from 'react';
import { Upload, ShieldCheck, AlertTriangle, Cpu, Scale, Lightbulb, Key, X, Check } from "lucide-react";
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function FairnessDashboard() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mitigating, setMitigating] = useState(false);
  const [mitigationResult, setMitigationResult] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // New States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loadingPhase, setLoadingPhase] = useState("Reading dataset...");

  // Load API key from local storage & Mouse Spotlight
  useEffect(() => {
    const savedKey = localStorage.getItem("fairness_api_key");
    if (savedKey) setApiKey(savedKey);

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("fairness_api_key", apiKey);
    setIsModalOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setLoading(true);
    setResult(null);
    setMitigationResult(null);

    // Simulate loading phases
    const phases = ["Detecting Schema...", "Isolating Protected Attributes...", "Calculating SPD Scores..."];
    let phaseIndex = 0;
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setLoadingPhase(phases[phaseIndex]);
    }, 2000);

    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const API_BASE = `http://${window.location.hostname}:8000/api`;
      const res = await fetch(`${API_BASE}/analyze-bias`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleMitigate = async () => {
    if (!uploadedFile) return;
    
    setMitigating(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const API_BASE = `http://${window.location.hostname}:8000/api`;
      const res = await fetch(`${API_BASE}/mitigate`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      setMitigationResult(data.mitigation_suggestion);
    } catch (err) {
      console.error(err);
    } finally {
      setMitigating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 relative flex flex-col items-center p-6 overflow-x-hidden font-sans selection:bg-blue-500/30">
      <div className="cursor-spotlight"></div>
      
      {/* Background glow effects */}
      <div className="glow-purple top-1/4 left-1/4 opacity-70"></div>
      <div className="glow-blue bottom-1/4 right-1/4 opacity-70"></div>

      {/* Nav/Header Setup */}
      <nav className="w-full p-6 flex justify-between items-center z-10 max-w-7xl mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <span className="text-2xl font-bold tracking-wider text-white">
            Fairness Firewall <span className="text-sm font-light opacity-50 ml-2">v2026.1</span>
          </span>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass px-6 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-all duration-300 text-white border border-slate-700 flex items-center gap-2 cursor-pointer"
        >
          {apiKey ? <Check className="w-4 h-4 text-green-400" /> : <Key className="w-4 h-4 text-blue-400" />}
          {apiKey ? "API Connected" : "Connect API"}
        </button>
      </nav>

      {/* API Key Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-lg p-8 relative border border-slate-700 shadow-2xl scale-in-center">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Key className="text-blue-400" /> API Configuration
            </h2>
            <p className="text-slate-400 font-light mb-6">
              Enter your Google AI Studio API key. This will be stored locally in your browser and injected into your requests.
            </p>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 mb-6 font-mono"
            />
            <button onClick={saveApiKey} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer">
              Save Configuration
            </button>
          </div>
        </div>
      )}

      <div className="text-center z-10 w-full max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-white">
          Universal Audits <br /> With AI Intel.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12">
          Schema-Agnostic bias detection powered by Gemma 4. Upload any dataset and let the AI automatically identify protected attributes and calculate Statistical Parity.
        </p>

        {/* Upload Area styled with Premium Glassmorphism */}
        <div className="glass-card p-12 text-center relative overflow-hidden group transition-all hover:border-blue-400/50">
          <input type="file" onChange={handleUpload} className="hidden" id="file-upload" accept=".csv" />
          
          {loading ? (
            <div className="flex flex-col items-center gap-6 relative z-10 py-4">
              <div className="w-24 h-24 rounded-full glass flex items-center justify-center relative overflow-hidden">
                <Cpu className="w-10 h-10 text-blue-400 z-10" />
                <div className="absolute inset-0 progress-bar-glow opacity-50"></div>
              </div>
              <p className="text-2xl font-semibold text-white animate-pulse">
                {loadingPhase}
              </p>
              
              {/* Sleek Progress Bar */}
              <div className="w-full max-w-sm h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2 relative">
                 <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-500 rounded-full progress-bar-glow"></div>
              </div>
            </div>
          ) : (
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-6 relative z-10">
              <div className="w-24 h-24 rounded-full glass flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-10 h-10 text-blue-400 group-hover:text-blue-300 transition-colors" />
              </div>
              <p className="text-2xl font-semibold text-white">
                Drop your dataset (CSV) here to run Universal Audit
              </p>
              <p className="text-slate-400 font-light tracking-wide shadow-sm rounded-lg py-1 px-3 border border-slate-700/50">
                Supported formats: .csv
              </p>
            </label>
          )}
        </div>

        {/* Results Area styled with Premium Glassmorphism */}
        {result && (
          <div className="mt-12 text-left animate-in fade-in slide-in-from-bottom-8 duration-500 relative overflow-hidden flex flex-col gap-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="glass p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Scale className="w-16 h-16"/></div>
                <p className="text-sm font-medium text-blue-300 uppercase tracking-widest">Max SPD Score</p>
                <div className="flex items-end gap-2">
                  <p className={`text-6xl font-mono font-bold mix-blend-screen ${result.math_score > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
                    {result.math_score ? (result.math_score).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>
              <div className="glass p-6 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Cpu className="w-16 h-16"/></div>
                <p className="text-sm font-medium text-purple-300 uppercase tracking-widest">Gemma 4 Status</p>
                <div className="flex items-center h-full">
                  <p className="text-2xl font-semibold text-white">
                    Schema Detected
                  </p>
                </div>
              </div>
            </div>
            
            {/* Mitigation Condition */}
            {result.math_score > 0.1 && !mitigationResult && (
              <div className="glass p-8 rounded-2xl border border-red-500/30 bg-red-500/10 text-center relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 animate-pulse"></div>
                <p className="text-white text-lg mb-6 font-medium tracking-wide">High bias detected! The Statistical Parity Difference exceeds the 0.10 fairness threshold.</p>
                <button 
                  onClick={handleMitigate}
                  disabled={mitigating}
                  className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.7)] flex items-center justify-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer tracking-wider text-lg"
                >
                  <Lightbulb className={`w-6 h-6 ${mitigating ? 'animate-bounce text-yellow-300' : 'text-yellow-300'}`} />
                  {mitigating ? "Generating AI Strategy..." : "Generate Mitigation Strategy"}
                </button>
              </div>
            )}

            {/* AI Mitigation Display */}
            {mitigationResult && (
              <div className="glass p-8 rounded-3xl border border-blue-500/50 shadow-[0_0_40px_rgba(37,99,235,0.2)] relative z-10">
                <h3 className="text-xl font-bold text-white mb-6 tracking-wide border-b border-white/10 pb-4 flex items-center gap-3">
                  <Lightbulb className="text-yellow-400 w-6 h-6" /> Mitigation Strategy
                </h3>
                <div className="text-slate-300 font-light leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-th:text-white prose-td:text-slate-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 transition-colors">
                  <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{mitigationResult}</Markdown>
                </div>
              </div>
            )}

            <div className="p-8 glass border border-slate-700/50 rounded-3xl shadow-2xl relative z-10 bg-slate-900/40">
              <h3 className="text-xl font-bold text-white mb-6 tracking-wide border-b border-white/10 pb-4">
                Executive Audit Report
              </h3>
              <div className="text-slate-300 font-light leading-relaxed prose prose-invert max-w-none prose-p:leading-relaxed prose-th:text-white prose-td:text-slate-300 prose-a:text-blue-400 hover:prose-a:text-blue-300 transition-colors">
                <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{result.ai_reasoning}</Markdown>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
