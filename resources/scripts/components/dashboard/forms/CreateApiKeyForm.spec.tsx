import React from "react";
import {
  render,
  fireEvent,
  act,
  cleanup,
  waitFor,
} from "@testing-library/react";
import CreateApiKeyForm from "./CreateApiKeyForm";
import createApiKey from "@/api/account/createApiKey";
import { store } from "@/state";

vi.mock("@/api/account/createApiKey");
vi.mock("@/components/elements/SpinnerOverlay", () => ({
  default: ({ visible }: any) =>
    visible ? <div data-testid="spinner" /> : null,
}));
vi.mock("@/components/dashboard/ApiKeyModal", () => ({
  default: ({ visible, apiKey, onModalDismissed }: any) =>
    visible ? (
      <div data-testid="api-key-modal">
        <span>Generated Key: {apiKey}</span>
        <button onClick={onModalDismissed}>Close Modal</button>
      </div>
    ) : null,
}));

describe("CreateApiKeyForm component", () => {
  const mockOnKeyCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store.getState().flashes.clearFlashes();
  });

  afterEach(cleanup);

  it("renders form fields with description and allowed IPs inputs", () => {
    const { getByLabelText, getByRole } = render(
      <CreateApiKeyForm onKeyCreated={mockOnKeyCreated} />,
    );

    expect(getByLabelText("Description")).toBeDefined();
    expect(getByLabelText("Allowed IPs")).toBeDefined();
    expect(getByRole("button", { name: "Create" })).toBeDefined();
  });

  it("successfully creates an API key and displays the ApiKeyModal", async () => {
    (createApiKey as any).mockResolvedValue({
      identifier: "ptlc_abc123",
      secretToken: "xyz987token",
      description: "Discord Bot Token",
      allowedIps: [],
      createdAt: new Date(),
    });

    const { getByLabelText, getByRole, getByTestId, getByText } = render(
      <CreateApiKeyForm onKeyCreated={mockOnKeyCreated} />,
    );

    const descInput = getByLabelText("Description");
    const ipsInput = getByLabelText("Allowed IPs");
    const createBtn = getByRole("button", { name: "Create" });

    await act(async () => {
      fireEvent.change(descInput, { target: { value: "Discord Bot Token" } });
      fireEvent.change(ipsInput, {
        target: { value: "192.168.1.1\n10.0.0.1" },
      });
    });

    await act(async () => {
      fireEvent.click(createBtn);
    });

    expect(createApiKey).toHaveBeenCalledWith(
      "Discord Bot Token",
      "192.168.1.1\n10.0.0.1",
    );

    expect(mockOnKeyCreated).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "ptlc_abc123" }),
    );

    // ApiKeyModal is displayed with full key
    expect(getByTestId("api-key-modal")).toBeDefined();
    expect(getByText("Generated Key: ptlc_abc123xyz987token")).toBeDefined();

    // Closing modal dismisses it
    await act(async () => {
      fireEvent.click(getByText("Close Modal"));
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="api-key-modal"]'),
      ).toBeNull();
    });
  });

  it("records error flash when createApiKey rejects", async () => {
    (createApiKey as any).mockRejectedValue(
      new Error("Maximum number of API keys reached."),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { getByLabelText, getByRole } = render(
      <CreateApiKeyForm onKeyCreated={mockOnKeyCreated} />,
    );

    await act(async () => {
      fireEvent.change(getByLabelText("Description"), {
        target: { value: "Valid Key Name" },
      });
    });

    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Create" }));
    });

    const flashes = store.getState().flashes.items;
    expect(
      flashes.some(
        (f) =>
          f.key === "account" &&
          f.message === "Maximum number of API keys reached.",
      ),
    ).toBe(true);

    consoleSpy.mockRestore();
  });
});
