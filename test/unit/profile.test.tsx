import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Profile from "~/routes/profile";
import { puterMock, resetPuterMock, seedPuterKV, DEFAULT_MOCK_USER } from "../mocks/puterMock";
import { usePuterStore } from "~/services/puter/store";

const MOCK_PROFILE = {
  uuid: DEFAULT_MOCK_USER.uuid,
  username: DEFAULT_MOCK_USER.username,
  displayName: "Jane Developer",
  email: "jane@example.com",
  targetRole: "Senior Full-Stack Engineer",
  industry: "Technology / Software",
  experienceLevel: "senior",
  preferences: {
    evaluationStrictness: "strict",
    starTonePreference: "impact",
    targetAtsScore: 90,
  },
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-01T12:00:00.000Z",
};

describe("User Profile Management Route (app/routes/profile.tsx)", () => {
  beforeEach(async () => {
    resetPuterMock();
    (window as any).puter = puterMock;
    (globalThis as any).puter = puterMock;

    // Seed mock files into FS for storage calculation
    await puterMock.fs.write("resumes/doc-1.pdf", "file-content-1");
    await puterMock.fs.write("resumes/doc-2.pdf", "file-content-2");

    usePuterStore.setState({
      authStatus: "authenticated",
      puterReady: true,
      isLoading: false,
      auth: {
        user: DEFAULT_MOCK_USER,
        isAuthenticated: true,
        authStatus: "authenticated",
        signIn: vi.fn(),
        signOut: vi.fn(),
        refreshUser: vi.fn(),
        checkAuthStatus: vi.fn(async () => true),
        getUser: () => DEFAULT_MOCK_USER,
      },
      kv: {
        get: (key: string) => puterMock.kv.get(key),
        set: (key: string, value: string) => puterMock.kv.set(key, value),
        delete: (key: string) => puterMock.kv.del(key),
        list: (pattern: string, returnValues?: boolean) => puterMock.kv.list(pattern, returnValues),
        flush: () => puterMock.kv.flush(),
      },
      fs: {
        write: (path: string, data: any) => puterMock.fs.write(path, data),
        read: (path: string) => puterMock.fs.read(path),
        upload: (files: any) => puterMock.fs.upload(files),
        delete: (path: string) => puterMock.fs.delete(path),
        readDir: (path: string) => puterMock.fs.readdir(path),
      },
    });
  });

  it("1. displays Puter user identification header (avatar initials, username, UUID badge, cloud connection status)", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(`@${DEFAULT_MOCK_USER.username}`).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(DEFAULT_MOCK_USER.uuid)).toBeInTheDocument();
    expect(screen.getByText(/puter cloud connected/i)).toBeInTheDocument();
  });

  it("2. loads and populates profile data from Puter KV (user_profile:${uuid})", async () => {
    seedPuterKV({
      [`user_profile:${DEFAULT_MOCK_USER.uuid}`]: MOCK_PROFILE,
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Jane Developer")).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Senior Full-Stack Engineer")).toBeInTheDocument();
    expect(screen.getByLabelText(/experience level/i)).toHaveValue("senior");
  });

  it("3. defaults to sensible fallback values when no profile exists in Puter KV", async () => {
    seedPuterKV({}); // Empty KV

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/full name or display name/i)).toHaveValue("");
    });

    // Default strictness is 'balanced'
    expect(screen.getByLabelText(/balanced/i)).toBeChecked();

    // Default STAR tone is 'impact'
    expect(screen.getByLabelText(/impact & roi/i)).toBeChecked();

    // Default ATS Target Score is 85
    expect(screen.getByRole("slider")).toHaveValue("85");
  });

  it("4. updates career profile inputs (Display Name, Target Role, Industry, Experience)", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/target job role/i)).toBeInTheDocument();
    });

    const roleInput = screen.getByLabelText(/target job role/i);
    await user.clear(roleInput);
    await user.type(roleInput, "Staff AI Systems Engineer");

    expect(roleInput).toHaveValue("Staff AI Systems Engineer");
  });

  it("5. toggles AI evaluation strictness and adjusts Target ATS score slider", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole("slider")).toBeInTheDocument());

    // Switch Strictness to 'Strict (FAANG-grade)'
    const strictRadio = screen.getByLabelText(/strict/i);
    fireEvent.click(strictRadio);
    expect(strictRadio).toBeChecked();

    // Move slider to 95
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "95" } });
    expect(slider).toHaveValue("95");
    expect(screen.getByTestId("target-score-badge")).toHaveTextContent("95/100");
  });

  it("6. saves profile changes atomically to Puter KV under key user_profile:${uuid}", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/display name/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/display name/i), "Alex Rivers");
    await user.type(screen.getByLabelText(/contact email/i), "alex@rivers.io");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    // Check Puter KV store
    const stored = puterMock.kvStore.get(`user_profile:${DEFAULT_MOCK_USER.uuid}`);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.displayName).toBe("Alex Rivers");
    expect(parsed.email).toBe("alex@rivers.io");
  });

  it("7. calculates and renders Puter FS cloud storage metrics", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("cloud-storage-files-count")).toBeInTheDocument();
    });

    // 2 files were seeded into Puter FS
    expect(screen.getByTestId("cloud-storage-files-count")).toHaveTextContent("2 files");
  });

  it("8. triggers Puter signOut and redirects on Sign Out button click in Danger Zone", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /sign out of puter/i })).toBeInTheDocument());

    const signOutBtn = screen.getByRole("button", { name: /sign out of puter/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(usePuterStore.getState().auth.signOut).toHaveBeenCalled();
    });
  });

  it("9. [Adversarial] handles empty string inputs for career profile fields and persists without throwing", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/display name/i)).toBeInTheDocument());

    // Set all inputs to empty strings
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/contact email/i), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/target job role/i), { target: { value: "" } });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    const stored = puterMock.kvStore.get(`user_profile:${DEFAULT_MOCK_USER.uuid}`);
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.displayName).toBe("");
    expect(parsed.email).toBe("");
    expect(parsed.targetRole).toBe("");
  });

  it("10. [Adversarial] supports extreme ATS target scores (0 and 100) and persists them accurately to Puter KV", async () => {
    // 10A: Seed extreme target score 0 in KV
    seedPuterKV({
      [`user_profile:${DEFAULT_MOCK_USER.uuid}`]: {
        ...MOCK_PROFILE,
        preferences: {
          ...MOCK_PROFILE.preferences,
          targetAtsScore: 0,
        },
      },
    });

    const { unmount } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("target-score-badge")).toHaveTextContent("0/100"));

    // Save and verify 0 persists to Puter KV
    const saveButton1 = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton1);
    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    let stored = puterMock.kvStore.get(`user_profile:${DEFAULT_MOCK_USER.uuid}`);
    let parsed = JSON.parse(stored!);
    expect(parsed.preferences.targetAtsScore).toBe(0);

    unmount();

    // 10B: Test extreme score 100 via slider UI interaction
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByRole("slider")).toBeInTheDocument());
    const slider = screen.getByRole("slider");
    const saveButton2 = screen.getByRole("button", { name: /save changes/i });

    // Slider UI boundary: changing to 100
    fireEvent.change(slider, { target: { value: "100" } });
    expect(slider).toHaveValue("100");
    expect(screen.getByTestId("target-score-badge")).toHaveTextContent("100/100");

    fireEvent.click(saveButton2);
    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    stored = puterMock.kvStore.get(`user_profile:${DEFAULT_MOCK_USER.uuid}`);
    parsed = JSON.parse(stored!);
    expect(parsed.preferences.targetAtsScore).toBe(100);

    // 10C: Verify UI constraint: range input min="50" clamps attempts to drag below 50
    fireEvent.change(slider, { target: { value: "0" } });
    expect(slider).toHaveValue("50");
  });

  it("11. [Adversarial] handles rapid consecutive preference save clicks without race conditions or state corruption", async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/display name/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Rapid Saver" } });
    const saveButton = screen.getByRole("button", { name: /save changes/i });

    // Fire 5 rapid consecutive click events
    for (let i = 0; i < 5; i++) {
      fireEvent.click(saveButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    const stored = puterMock.kvStore.get(`user_profile:${DEFAULT_MOCK_USER.uuid}`);
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed.displayName).toBe("Rapid Saver");
    expect(parsed.uuid).toBe(DEFAULT_MOCK_USER.uuid);
  });

  it("12. [Adversarial] verifies strict persistence key format user_profile:${uuid}", async () => {
    const customUser = {
      uuid: "usr_adversarial_custom_9876",
      username: "adversarial_user",
    };

    usePuterStore.setState({
      auth: {
        ...usePuterStore.getState().auth,
        user: customUser,
      },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText(/display name/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "Key Format Test" } });
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/profile saved successfully/i)).toBeInTheDocument();
    });

    // The key in Puter KV MUST strictly match user_profile:${uuid}
    const expectedKey = `user_profile:${customUser.uuid}`;
    expect(puterMock.kvStore.has(expectedKey)).toBe(true);

    // Negative assertions: ensure incorrect keys were NOT created
    expect(puterMock.kvStore.has("user_profile")).toBe(false);
    expect(puterMock.kvStore.has(`profile:${customUser.uuid}`)).toBe(false);
    expect(puterMock.kvStore.has(`user:${customUser.uuid}`)).toBe(false);
  });
});
