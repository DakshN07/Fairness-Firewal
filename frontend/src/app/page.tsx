"use client";

import { useState, useEffect } from 'react';
import { Upload, ShieldCheck, AlertTriangle, Cpu, Scale, Lightbulb, Key, X, Check, Link as LinkIcon } from "lucide-react";
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
  const [datasetUrl, setDatasetUrl] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  
  // New States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [loadingPhase, setLoadingPhase] = useState("Reading dataset...");
  const [showScopeBanner, setShowScopeBanner] = useState(true);
  const [exemptedColumns, setExemptedColumns] = useState("");

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
    setDatasetUrl(""); // Clear URL
    await executeAnalysis(file, null);
  };

  const handleUrlSubmit = async () => {
    if (!datasetUrl.trim()) return;
    setUploadedFile(null); // Clear file
    await executeAnalysis(null, datasetUrl.trim());
  };

  const executeAnalysis = async (file: File | null, url: string | null) => {
    setLoading(true);
    setResult(null);
    setMitigationResult(null);

    // Simulate loading phases
    const phases = url ? ["Downloading Dataset...", "Detecting Schema...", "Isolating Protected Attributes...", "Calculating SPD Scores..."] 
                       : ["Detecting Schema...", "Isolating Protected Attributes...", "Calculating SPD Scores..."];
    let phaseIndex = 0;
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setLoadingPhase(phases[phaseIndex]);
    }, 2000);

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (url) formData.append('dataset_url', url);
    
    if (exemptedColumns.trim()) {
      formData.append('exempted_columns', exemptedColumns.trim());
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`;
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
    if (!uploadedFile && !datasetUrl) return;
    
    setMitigating(true);
    const formData = new FormData();
    if (uploadedFile) formData.append('file', uploadedFile);
    if (datasetUrl) formData.append('dataset_url', datasetUrl);

    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api`;
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
    <div className="h-screen w-screen overflow-hidden bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 text-white relative">
      <div className="cursor-spotlight"></div>
      
      {/* Animated Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="bg-marquee absolute top-[30%] left-0">
          FAIRNESS FIREWALL &bull; 2026 GOOGLE SOLUTION CHALLENGE &bull; BIAS MITIGATION &bull; FAIRNESS FIREWALL &bull; 2026 GOOGLE SOLUTION CHALLENGE &bull; BIAS MITIGATION &bull; FAIRNESS FIREWALL &bull; 2026 GOOGLE SOLUTION CHALLENGE &bull; BIAS MITIGATION
        </div>
        <div className="glow-purple top-1/4 left-1/4 opacity-70"></div>
        <div className="glow-blue bottom-1/4 right-1/4 opacity-70"></div>
      </div>

      {/* Scope Banner */}
      {showScopeBanner && (
        <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-blue-500/30 text-slate-300 py-2 px-6 flex justify-between items-center z-50 text-sm font-light shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-blue-400" />
            <span>Fairness Firewall audits raw datasets before model training. It does not monitor live models, streaming data, or real-time inference pipelines.</span>
          </div>
          <button onClick={() => setShowScopeBanner(false)} className="hover:text-white transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="w-full px-8 py-4 flex justify-between items-center z-10 shrink-0 border-b border-white/5 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold tracking-wider text-white m-0">
            Fairness Firewall <span className="text-xs font-light opacity-50 ml-2">v2026.1</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="glass px-5 py-2 rounded-full text-sm font-medium hover:bg-white/10 transition-all duration-300 text-white border border-slate-700 flex items-center gap-2 cursor-pointer shadow-lg"
        >
          {apiKey ? <Check className="w-4 h-4 text-green-400" /> : <Key className="w-4 h-4 text-blue-400" />}
          {apiKey ? "API Connected" : "Connect API"}
        </button>
      </header>

      {/* Main 3-Column Content */}
      <main className="flex-1 flex flex-row overflow-hidden p-6 gap-6 z-10 relative">
        
        {/* LEFT COLUMN: Upload Area */}
        <aside className="w-1/4 h-full glass-card p-6 flex flex-col gap-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-blue-300 border-b border-white/10 pb-2">Dataset Source</h2>
          <p className="text-sm text-slate-400 font-light">
            Upload any CSV to automatically identify protected attributes and calculate Statistical Parity.
          </p>
          
          <div className="glass p-8 text-center relative overflow-hidden group transition-all hover:border-blue-400/50 rounded-2xl flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <div className="flex gap-2 w-full max-w-xs mx-auto mb-4 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 relative z-10">
              <button 
                onClick={() => setUploadMode("file")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === "file" ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                File Upload
              </button>
              <button 
                onClick={() => setUploadMode("url")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === "url" ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Cloud URL
              </button>
            </div>

            {uploadMode === "file" ? (
              <>
                <input type="file" onChange={handleUpload} className="hidden" id="file-upload" accept=".csv" />
                {loading ? (
                  <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                    <div className="w-16 h-16 rounded-full glass flex items-center justify-center relative overflow-hidden">
                      <Cpu className="w-8 h-8 text-blue-400 z-10" />
                      <div className="absolute inset-0 progress-bar-glow opacity-50"></div>
                    </div>
                    <p className="text-sm font-semibold text-white animate-pulse text-center">
                      {loadingPhase}
                    </p>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative mt-2">
                       <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-500 rounded-full progress-bar-glow"></div>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4 relative z-10 w-full h-full justify-center py-8">
                    <div className="w-16 h-16 rounded-full glass flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg">
                      <Upload className="w-8 h-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
                    </div>
                    <p className="text-base font-semibold text-white">
                      Drop dataset here
                    </p>
                    <p className="text-xs text-slate-400 font-light tracking-wide shadow-sm rounded border border-slate-700/50 px-3 py-1 bg-slate-900/50">
                      Supported: .csv
                    </p>
                  </label>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 relative z-10 w-full h-full justify-center py-4">
                {loading ? (
                  <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                    <div className="w-16 h-16 rounded-full glass flex items-center justify-center relative overflow-hidden">
                      <Cpu className="w-8 h-8 text-blue-400 z-10" />
                      <div className="absolute inset-0 progress-bar-glow opacity-50"></div>
                    </div>
                    <p className="text-sm font-semibold text-white animate-pulse text-center">
                      {loadingPhase}
                    </p>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative mt-2">
                       <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-500 rounded-full progress-bar-glow"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full glass flex items-center justify-center mb-2">
                      <LinkIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <input 
                      type="text" 
                      value={datasetUrl}
                      onChange={(e) => setDatasetUrl(e.target.value)}
                      placeholder="https://s3.amazonaws.../data.csv"
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-500 shadow-inner"
                    />
                    <button 
                      onClick={handleUrlSubmit}
                      disabled={!datasetUrl.trim()}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors mt-2"
                    >
                      Analyze URL
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: Main Report & Results */}
        <section className="flex-1 h-full glass-card p-8 flex flex-col gap-6 overflow-y-auto relative">
          <div className="text-center mb-2">
            <p className="text-sm text-blue-400 tracking-widest uppercase mb-2 font-bold opacity-80">2026 Google Solution Challenge</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-white pb-2">
              Universal Bias Audit
            </h2>
          </div>

          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-50 gap-4 min-h-[300px]">
              <ShieldCheck className="w-24 h-24 stroke-1" />
              <p className="text-lg font-light tracking-wider uppercase">Awaiting Dataset</p>
            </div>
          )}

          {result && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 flex flex-col gap-6">
              
              {/* Data Sufficiency Warning */}
              {(result.small_dataset || result.sparse_subgroups) && (
                <div className="glass p-4 rounded-xl border border-yellow-500/50 bg-yellow-500/10 flex items-start gap-3 shadow-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-100 text-sm font-light leading-relaxed">
                    <strong>Data Sufficiency Warning:</strong> {result.small_dataset ? "Dataset may be too small (<300 rows). " : ""}{result.sparse_subgroups ? "Some subgroups have very few samples (<30). " : ""}Results should be interpreted with caution.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="glass p-5 rounded-xl flex flex-col justify-center relative overflow-hidden group shadow-md border-slate-700/50">
                  <p className="text-xs font-medium text-blue-300 uppercase tracking-widest flex items-center justify-between mb-2">
                    Max SPD Score
                  </p>
                  <div className="flex items-center gap-3">
                    <p className={`text-4xl font-mono font-bold ${result.math_score > 0.1 ? 'text-red-400' : 'text-green-400'}`}>
                      {result.math_score ? (result.math_score).toFixed(2) : '0.00'}
                    </p>
                    {(result.small_dataset || result.sparse_subgroups) && (
                      <span className="bg-yellow-500/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded border border-yellow-500/30 whitespace-nowrap">
                        Low Confidence
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="glass p-5 rounded-xl flex flex-col justify-center relative overflow-hidden group shadow-md border-slate-700/50">
                  <p className="text-xs font-medium text-purple-300 uppercase tracking-widest mb-2">Gemma 4 Status</p>
                  <p className="text-xl font-semibold text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-400" /> Schema Detected
                  </p>
                </div>
              </div>

              {/* Mitigation Condition */}
              {result.math_score > 0.1 && !mitigationResult && (
                <div className="glass p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <p className="text-red-200 text-sm font-medium text-left leading-snug">High bias detected! The Statistical Parity Difference exceeds the 0.10 threshold.</p>
                  <button 
                    onClick={handleMitigate}
                    disabled={mitigating}
                    className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-xl hover:shadow-red-500/20 flex items-center gap-2 text-sm shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <Lightbulb className={`w-4 h-4 ${mitigating ? 'animate-bounce text-yellow-300' : 'text-white'}`} />
                    {mitigating ? "Generating Strategy..." : "Mitigate Bias"}
                  </button>
                </div>
              )}

              {/* AI Mitigation Display */}
              {mitigationResult && (
                <div className="glass p-6 rounded-xl border border-blue-500/50 shadow-xl bg-blue-900/10">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-blue-500/30 pb-2 flex items-center gap-2">
                    <Lightbulb className="text-yellow-400 w-5 h-5" /> Mitigation Strategy
                  </h3>
                  <div className="text-slate-300 text-sm font-light leading-relaxed prose prose-sm prose-invert max-w-none prose-a:text-blue-400">
                    <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{mitigationResult}</Markdown>
                  </div>
                </div>
              )}

              <div className="p-6 glass border border-slate-700/50 rounded-xl bg-slate-900/60 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">
                  Executive Audit Report
                </h3>
                <div className="text-slate-300 text-sm font-light leading-relaxed prose prose-sm prose-invert max-w-none prose-a:text-blue-400">
                  <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{result.ai_reasoning}</Markdown>
                </div>
              </div>

            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Advanced Settings */}
        <aside className="w-1/4 h-full glass-card p-6 flex flex-col gap-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-purple-300 border-b border-white/10 pb-2">Configuration</h2>
          
          <div className="glass p-5 rounded-xl border border-slate-700/50 flex flex-col gap-3 shadow-md">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
               Legal Exceptions
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Exclude columns from fairness scoring due to legal or policy exemptions (e.g., age-gated products).
            </p>
            <input 
              type="text" 
              value={exemptedColumns}
              onChange={(e) => setExemptedColumns(e.target.value)}
              placeholder="e.g., age, gender"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-purple-500 shadow-inner"
            />
          </div>

          <div className="glass p-5 rounded-xl border border-slate-700/50 flex flex-col gap-3 opacity-60 shadow-md">
             <h3 className="text-sm font-bold text-white">Threshold Tuning</h3>
             <p className="text-xs text-slate-400 font-light">
               Adjust the acceptable SPD limit. (Currently locked at 0.10 for compliance).
             </p>
             <input type="range" min="0" max="100" value="10" disabled className="w-full opacity-50 cursor-not-allowed" />
          </div>
        </aside>

      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs font-light text-slate-500 border-t border-white/5 bg-slate-900/60 backdrop-blur-md shrink-0">
        Fairness Firewall &copy; 2026. Built securely on Google Cloud & Next.js for the Google Solution Challenge.
      </footer>

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
            <p className="text-slate-400 font-light mb-6 text-sm">
              Enter your Google AI Studio API key. This will be stored locally in your browser and injected into your requests.
            </p>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 mb-6 font-mono text-sm"
            />
            <button onClick={saveApiKey} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] cursor-pointer text-sm">
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
