"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle, AlertTriangle, X, RefreshCw } from "lucide-react";
import { uploadManual } from "../utils/api";

interface ManualUploaderProps {
  vehicleId: number;
}

export default function ManualUploader({ vehicleId }: ManualUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [chunksIndexed, setChunksIndexed] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setStatus("error");
      setErrorMessage("Only PDF (.pdf) files are supported for vehicle owner manuals.");
      return;
    }

    setFileName(file.name);
    setStatus("uploading");
    setProgress(0);
    setErrorMessage("");
    setChunksIndexed(null);

    uploadManual(vehicleId, file, (percent) => {
      setProgress(percent);
    })
      .then((res) => {
        setStatus("success");
        setChunksIndexed(res.chunks_index);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err.message || "Failed to upload manual.");
      });
  };

  const resetUploader = () => {
    setStatus("idle");
    setProgress(0);
    setFileName("");
    setChunksIndexed(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyan-400" />
          Technical Manuals
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Upload PDF manuals to index technical specifications (e.g. fluid type, torque specs) for the Copilot.
        </p>
      </div>

      {/* Drag & Drop Box */}
      {status === "idle" && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition duration-200 flex flex-col items-center justify-center gap-3 ${
            isDragActive
              ? "border-cyan-500 bg-cyan-500/5"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          <UploadCloud className={`w-8 h-8 transition-colors ${isDragActive ? "text-cyan-400" : "text-slate-500"}`} />
          <div>
            <p className="text-xs font-semibold text-slate-350">
              Drag and drop PDF manual here
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              or click to browse from files
            </p>
          </div>
        </div>
      )}

      {/* Uploading Status */}
      {status === "uploading" && (
        <div className="border border-slate-800 bg-slate-950/20 p-5 rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-cyan-500 border-r-slate-800 border-b-slate-800 border-l-slate-800" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-200 truncate">{fileName}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Uploading and indexing document...</p>
            </div>
            <span className="font-semibold text-cyan-400 font-mono">{progress}%</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-850">
            <div
              className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Status */}
      {status === "success" && (
        <div className="border border-emerald-500/25 bg-emerald-500/5 p-4 rounded-lg flex flex-col gap-3">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">Manual Indexed Successfully</h4>
              <p className="text-[11px] text-slate-350 mt-1 truncate">{fileName}</p>
              
              {chunksIndexed !== null && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  <span>{chunksIndexed} chunks indexed</span>
                </div>
              )}
            </div>
            <button
              onClick={resetUploader}
              className="text-slate-500 hover:text-slate-300 p-0.5 self-start rounded hover:bg-slate-850 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={resetUploader}
            className="w-full bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 py-1.5 rounded-lg border border-slate-800 transition"
          >
            Upload Another Manual
          </button>
        </div>
      )}

      {/* Error Status */}
      {status === "error" && (
        <div className="border border-red-500/25 bg-red-500/5 p-4 rounded-lg flex flex-col gap-3">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white">Ingestion Failed</h4>
              <p className="text-[11px] text-red-300 mt-1 leading-relaxed">{errorMessage}</p>
              {fileName && <p className="text-[10px] text-slate-500 mt-1 truncate">{fileName}</p>}
            </div>
            <button
              onClick={resetUploader}
              className="text-slate-500 hover:text-slate-300 p-0.5 self-start rounded hover:bg-slate-850 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={resetUploader}
            className="w-full bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 py-1.5 rounded-lg border border-slate-800 transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
