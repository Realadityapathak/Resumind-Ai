import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useSafeTimeout } from "~/hooks/useSafeTimeout";

function Probe({ onFire }: { onFire: () => void }) {
  const scheduleTimeout = useSafeTimeout();
  return (
    <button type="button" onClick={() => scheduleTimeout(onFire, 3500)}>
      schedule
    </button>
  );
}

describe("useSafeTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs a scheduled callback while the component is mounted", () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const { getByRole } = render(<Probe onFire={onFire} />);

    fireEvent.click(getByRole("button", { name: "schedule" }));
    vi.advanceTimersByTime(3499);
    expect(onFire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFire).toHaveBeenCalledOnce();
  });

  it("cancels every pending callback and timer on unmount", () => {
    vi.useFakeTimers();
    const onFire = vi.fn();
    const { getByRole, unmount } = render(<Probe onFire={onFire} />);

    fireEvent.click(getByRole("button", { name: "schedule" }));
    fireEvent.click(getByRole("button", { name: "schedule" }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(onFire).not.toHaveBeenCalled();
  });
});
