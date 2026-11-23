import { useState, useCallback, type MouseEvent } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { formatSize } from "~/utils/formatSize";
import Icon from "~/components/ui/Icon";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections && fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const isTooLarge = rejection.errors.some((e) => e.code === "file-too-large");
        const isInvalidType = rejection.errors.some((e) => e.code === "file-invalid-type");

        if (isTooLarge) {
          setErrorMessage(`File is too large. Maximum size is ${formatSize(MAX_FILE_SIZE)}.`);
        } else if (isInvalidType) {
          setErrorMessage("Invalid file type. Please upload a PDF file.");
        } else {
          setErrorMessage(rejection.errors[0]?.message || "File upload rejected. Please try again.");
        }
        setSelectedFile(null);
        onFileSelect?.(null);
        return;
      }

      const file = acceptedFiles[0] || null;
      setSelectedFile(file);
      setErrorMessage(null);
      onFileSelect?.(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: MAX_FILE_SIZE,
  });

  const handleRemove = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
    setErrorMessage(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onFileSelect?.(null);
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`rounded-[3px] border p-1.5 transition-[border-color,background-color,transform] duration-200 ${
          isDragActive ? "scale-[1.005] border-cobalt bg-cobalt-wash" : "border-rule bg-surface"
        }`}
      >
        <input {...getInputProps()} />

        <div className="cursor-pointer">
          {selectedFile ? (
            <div className="uploader-selected-file animate-fadeIn" onClick={(e) => e.stopPropagation()}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-[2px] border border-rule bg-surface text-cobalt">
                  <Icon name="file" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate max-w-xs text-[13px] font-medium text-ink">{selectedFile.name}</p>
                  <p className="text-[12px] text-ink-3">{formatSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 p-2 cursor-pointer rounded-[2px] text-ink-3 transition-colors hover:bg-surface hover:text-red-600"
                onClick={handleRemove}
                title="Remove file"
              >
                <img src="/icons/cross.svg" alt="remove" className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className={`uploader-drag-area flex flex-col items-center justify-center ${
              isDragActive ? "bg-cobalt-wash" : ""
            }`}>
              <div
                className={`mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-rule bg-surface text-cobalt transition-transform duration-200 ${
                  isDragActive ? "-translate-y-0.5 scale-110" : ""
                }`}
              >
                <Icon name="upload" size={19} />
              </div>
              <p className="text-[15px] text-ink-2">
                <span className="font-semibold text-ink">
                  {isDragActive ? "Drop the file here" : "Click to upload"}
                </span>{" "}
                <span className="text-ink-3">or drag and drop</span>
              </p>
              <p className="mt-1 text-[12px] text-ink-3">PDF (max {formatSize(MAX_FILE_SIZE)})</p>
            </div>
          )}
        </div>
      </div>
      {errorMessage && (
        <div
          role="alert"
          className="animate-fadeIn mt-3 flex items-center gap-2 rounded-[3px] border border-red-200 bg-red-50 p-3 text-[12px] text-red-700"
        >
          <Icon name="alert" size={15} className="shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
