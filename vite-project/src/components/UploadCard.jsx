import { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CheckCircle2, CloudUpload, FileText } from 'lucide-react';
import expensesClient from '../api/expensesClient';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(file) {
  const isPdf =
    file.name.toLowerCase().endsWith('.pdf') ||
    file.type === 'application/pdf';
  if (!isPdf) return 'Only PDF files are accepted (ICICI, GPay, PhonePe statements).';
  if (file.size > MAX_FILE_SIZE)
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`;
  return null;
}

// ─── Phase constants ─────────────────────────────────────────────────────────
const PHASE = /** @type {const} */ ({
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SUCCESS: 'success',
  ERROR: 'error',
});

export default function UploadCard({ onUploadSuccess, onError, householdId }) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);   // { transactionCount, needsReviewCount }
  const [inlineError, setInlineError] = useState('');
  const [fileName, setFileName] = useState('');

  const fileInputRef = useRef(null);
  const progressTimerRef = useRef(null);
  const resetTimerRef = useRef(null);

  // ── Reset to idle after delay ─────────────────────────────────────────────
  const scheduleReset = useCallback(() => {
    resetTimerRef.current = window.setTimeout(() => {
      setPhase(PHASE.IDLE);
      setProgress(0);
      setResult(null);
      setInlineError('');
      setFileName('');
    }, 3000);
  }, []);

  // ── Core upload logic ─────────────────────────────────────────────────────
  const processFile = useCallback(
    async (file) => {
      // Clear any pending resets from a previous cycle
      window.clearTimeout(resetTimerRef.current);
      window.clearInterval(progressTimerRef.current);

      const validationError = validateFile(file);
      if (validationError) {
        setInlineError(validationError);
        onError?.(validationError);
        // Show error inline but stay in IDLE so the zone remains interactive
        return;
      }

      setInlineError('');
      setFileName(file.name);
      setPhase(PHASE.UPLOADING);
      setProgress(5);

      // Animate progress: accelerates to ~90% then stalls until API resolves
      progressTimerRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          const step = (90 - p) * 0.12 + 2; // easing: faster early, slower near 90
          return Math.min(90, p + step);
        });
      }, 180);

      try {
        const res = await expensesClient.uploadStatement(file, householdId);
        window.clearInterval(progressTimerRef.current);
        setProgress(100);

        const parsed = {
          transactionCount: res?.transactionCount ?? 0,
          needsReviewCount: res?.needsReviewCount ?? 0,
        };
        setResult(parsed);
        setPhase(PHASE.SUCCESS);
        onUploadSuccess?.(res);
        scheduleReset();
      } catch (err) {
        window.clearInterval(progressTimerRef.current);
        const msg = err?.message || 'Upload failed. Please try again.';
        setInlineError(msg);
        setPhase(PHASE.ERROR);
        onError?.(msg);
        scheduleReset();
      }
    },
    [householdId, onUploadSuccess, onError, scheduleReset],
  );

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (phase !== PHASE.UPLOADING) setDragging(true);
  }, [phase]);

  const handleDragLeave = useCallback((e) => {
    // Only clear dragging when leaving the zone itself (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      if (phase === PHASE.UPLOADING) return;
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [phase, processFile],
  );

  // ── File input ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';          // allow re-selecting the same file
    },
    [processFile],
  );

  const handleZoneClick = useCallback(() => {
    if (phase !== PHASE.UPLOADING) fileInputRef.current?.click();
  }, [phase]);

  const handleZoneKeyDown = useCallback(
    (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && phase !== PHASE.UPLOADING) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [phase],
  );

  // ── Derived state ─────────────────────────────────────────────────────────
  const isUploading = phase === PHASE.UPLOADING;
  const isSuccess   = phase === PHASE.SUCCESS;
  const isError     = phase === PHASE.ERROR;
  const isIdle      = phase === PHASE.IDLE;

  const zoneClasses = [
    'rounded-xl border-2 border-dashed px-6 py-10 text-center',
    'transition-all duration-200 outline-none',
    isSuccess  ? 'border-emerald-500 bg-emerald-500/10 cursor-default' :
    isError    ? 'border-red-500 bg-red-500/10 cursor-pointer' :
    dragging   ? 'border-blue-400 bg-blue-500/10 scale-[1.015] shadow-lg cursor-copy' :
    isUploading ? 'border-cyan-600 bg-gray-900 cursor-wait' :
                  'border-gray-600 bg-gray-900 hover:border-blue-400 hover:bg-blue-500/5 cursor-pointer',
    !isUploading && !isSuccess ? 'focus-visible:ring-2 focus-visible:ring-cyan-500' : '',
  ].join(' ');

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-white">Upload Statement</h2>
        <span className="text-xs text-gray-400">ICICI · GPay · PhonePe · PDF</span>
      </div>

      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        aria-label="Upload bank statement PDF — drag and drop or click to browse"
        className={zoneClasses}
        onClick={handleZoneClick}
        onKeyDown={handleZoneKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isSuccess && (
          <>
            <CheckCircle2 className="w-11 h-11 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-emerald-300 mb-1">
              Statement uploaded successfully!
            </p>
            <p className="text-xs text-emerald-400">
              {result.transactionCount} transaction{result.transactionCount !== 1 ? 's' : ''} parsed.
            </p>
            {result.needsReviewCount > 0 && (
              <p className="mt-1 text-xs text-amber-300 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Needs Review: {result.needsReviewCount} transaction{result.needsReviewCount !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}

        {isError && (
          <>
            <AlertCircle className="w-11 h-11 text-red-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-red-300 mb-1">Upload failed</p>
            <p className="text-xs text-red-400">{inlineError}</p>
            <p className="mt-2 text-xs text-gray-500">Click to try again</p>
          </>
        )}

        {isUploading && (
          <>
            <FileText className="w-11 h-11 text-cyan-400 mx-auto mb-3 animate-pulse" />
            <p className="text-sm font-medium text-gray-200 truncate max-w-xs mx-auto mb-0.5">
              {fileName}
            </p>
            <p className="text-xs text-gray-400">Parsing statement…</p>
          </>
        )}

        {isIdle && (
          <>
            <CloudUpload
              className={`w-11 h-11 mx-auto mb-3 transition-colors duration-200 ${
                dragging ? 'text-blue-400' : 'text-gray-400'
              }`}
            />
            <p
              className={`text-sm font-medium mb-1 transition-colors duration-150 ${
                dragging ? 'text-blue-300' : 'text-gray-200'
              }`}
            >
              {dragging ? 'Drop to upload' : 'Drag your statement here or click to select'}
            </p>
            <p className="text-xs text-gray-500">PDF only · max 10 MB</p>
          </>
        )}
      </div>

      {/* Progress bar — visible only while uploading */}
      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
            <span>Uploading &amp; parsing…</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 rounded-full transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Inline validation error — shown only in IDLE phase */}
      {isIdle && inlineError && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {inlineError}
        </p>
      )}

      {/* Hidden file input — PDF only */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

UploadCard.propTypes = {
  /** Called with the raw API result after a successful upload. */
  onUploadSuccess: PropTypes.func,
  /** Called with an error message string on validation or upload failure. */
  onError: PropTypes.func,
  /** Household ID passed through to the API. */
  householdId: PropTypes.string,
};
