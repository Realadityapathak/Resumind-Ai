import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileUploader from "~/features/upload/FileUploader";

describe("FileUploader Component (app/components/FileUploader.tsx)", () => {
  it("renders upload invitation and max file size text in idle state", () => {
    render(<FileUploader />);
    expect(screen.getByText("Click to upload")).toBeInTheDocument();
    expect(screen.getByText("or drag and drop")).toBeInTheDocument();
    expect(screen.getByText("PDF (max 20 MB)")).toBeInTheDocument();
  });

  it("calls onFileSelect with dropped PDF file", async () => {
    const handleFileSelect = vi.fn();
    const { container } = render(<FileUploader onFileSelect={handleFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const mockPdf = new File(["dummy pdf content"], "my_resume.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, {
      target: { files: [mockPdf] },
    });

    await waitFor(() => {
      expect(handleFileSelect).toHaveBeenCalledTimes(1);
      expect(handleFileSelect).toHaveBeenCalledWith(mockPdf);
    });
  });

  it("handles remove button click: clears selection and stops propagation", async () => {
    const handleFileSelect = vi.fn();
    const { container } = render(<FileUploader onFileSelect={handleFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mockPdf = new File(["dummy pdf content"], "resume.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, {
      target: { files: [mockPdf] },
    });

    // When file is accepted, remove button is rendered
    const removeBtn = await screen.findByAltText("remove");
    expect(removeBtn).toBeInTheDocument();

    const stopPropagationSpy = vi.fn();
    fireEvent.click(removeBtn.closest("button")!, {
      stopPropagation: stopPropagationSpy,
    });

    // onFileSelect should be called with null when removed
    await waitFor(() => {
      expect(handleFileSelect).toHaveBeenLastCalledWith(null);
    });
  });

  it("displays clear error feedback when non-PDF file is selected", async () => {
    const handleFileSelect = vi.fn();
    const { container } = render(<FileUploader onFileSelect={handleFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(["dummy"], "malicious.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(input, {
      target: { files: [invalidFile] },
    });

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Invalid file type. Please upload a PDF file.");
      expect(screen.queryByText("malicious.exe")).not.toBeInTheDocument();
      expect(handleFileSelect).toHaveBeenCalledWith(null);
    });
  });

  it("displays clear error feedback when file exceeding 20MB is selected", async () => {
    const handleFileSelect = vi.fn();
    const { container } = render(<FileUploader onFileSelect={handleFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(["dummy large"], "huge_resume.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(largeFile, "size", { value: 25 * 1024 * 1024 });

    fireEvent.change(input, {
      target: { files: [largeFile] },
    });

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("File is too large. Maximum size is 20 MB.");
      expect(screen.queryByText("huge_resume.pdf")).not.toBeInTheDocument();
      expect(handleFileSelect).toHaveBeenCalledWith(null);
    });
  });

  it("clears error message when a valid PDF is subsequently selected", async () => {
    const handleFileSelect = vi.fn();
    const { container } = render(<FileUploader onFileSelect={handleFileSelect} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const invalidFile = new File(["image"], "photo.png", { type: "image/png" });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    const validFile = new File(["pdf content"], "valid.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByText("valid.pdf")).toBeInTheDocument();
      expect(handleFileSelect).toHaveBeenLastCalledWith(validFile);
    });
  });
});
