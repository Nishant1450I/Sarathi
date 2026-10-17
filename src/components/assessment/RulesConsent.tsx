import React, { useState } from 'react';
import { Shield, Lock, EyeOff, Clock, ArrowLeft, Play, Accessibility, Building2 } from 'lucide-react';

interface RulesConsentProps {
  domainTitle: string;
  roleTitle: string;
  onConsentAndStart: (consentData: {
    agreed: boolean;
    accommodations: {
      extendedTimeMultiplier: number;
      disabledRestrictions: boolean;
      screenReaderMode: boolean;
    };
  }) => void;
  onBack: () => void;
  isStarting?: boolean;
}

export const RulesConsent: React.FC<RulesConsentProps> = ({
  domainTitle,
  roleTitle,
  onConsentAndStart,
  onBack,
  isStarting = false,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1.0);
  const [screenReaderMode, setScreenReaderMode] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || isStarting) return;
    onConsentAndStart({
      agreed: true,
      accommodations: {
        extendedTimeMultiplier: timeMultiplier,
        disabledRestrictions: screenReaderMode || timeMultiplier > 1.0,
        screenReaderMode,
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {/* Step Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Step 2 of 3 · Recruiter Verification Protocol</span>
              <h1 className="text-xl font-bold text-[#0B1B43]">Secure Assessment Rules & Consent</h1>
              <p className="text-xs text-slate-500 font-medium">{roleTitle} · {domainTitle}</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            Recruiter Verified Session
          </span>
        </div>

        {/* Recruiter Guarantee Callout */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50/40 to-slate-50 border border-indigo-200/80 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 leading-relaxed">
            <strong className="text-indigo-900 block mb-0.5">Direct Employer Talent Pipeline Active</strong>
            Completing this secure assessment generates a tamper-proof verification report. Candidates scoring <span className="font-semibold text-indigo-700">75%+</span> are flagged for high-priority recruiter review and interview shortlists.
          </div>
        </div>

        {/* Verification Rules */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Focus Monitoring & Environment Integrity</span>
              <p className="text-slate-500 mt-0.5">
                Tab switches, window unfocus events, and clipboard activity are logged to prove authenticity to recruiters.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <EyeOff className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Strict Privacy & Zero Webcam Recording</span>
              <p className="text-slate-500 mt-0.5">
                No video feeds or private data are ever recorded or stored on remote servers. Full candidate biometric privacy is maintained.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Server-Side Countdown & Cloud Autosave</span>
              <p className="text-slate-500 mt-0.5">
                Answers autosave every 25 seconds. If you accidentally reload, your session state is immediately restored.
              </p>
            </div>
          </div>
        </div>

        {/* Accommodations */}
        <div className="mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0B1B43]">
            <Accessibility className="w-4 h-4 text-indigo-600" />
            <span>Accessibility & Fair Testing Accommodations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-medium">Timer Multiplier</label>
              <select
                value={timeMultiplier}
                onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
              >
                <option value={1.0}>1.0× Standard Duration</option>
                <option value={1.5}>1.5× Extended Time (+50%)</option>
                <option value={2.0}>2.0× Double Duration (+100%)</option>
              </select>
            </div>

            <div className="flex items-center justify-between sm:pt-4">
              <span className="text-slate-600 font-medium">Screen Reader Friendly Mode</span>
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">Accommodations ensure fair access and never lower your technical score.</p>
        </div>

        {/* Consent Checkbox */}
        <div className="mb-6 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              I agree to solve all questions independently without unauthorized AI assistants or human proxies. I understand this session will be validated and shared with partner recruiters.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            disabled={isStarting}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Mode Select
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!agreed || isStarting}
            className={`inline-flex items-center px-6 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
              agreed && !isStarting
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            {isStarting ? (
              <span>Initializing Session...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                <span>Begin Verified Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
