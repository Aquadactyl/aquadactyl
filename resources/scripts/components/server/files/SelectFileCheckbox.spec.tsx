import { fireEvent, render, screen } from "@testing-library/react";
import React, { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import SelectFileCheckbox, { FileActionCheckbox } from "./SelectFileCheckbox";
import { ServerContext } from "@/state/server";

describe("SelectFileCheckbox", () => {
  describe("FileActionCheckbox", () => {
    it("renders unchecked and calls onCheckedChange and onChange on toggle", () => {
      const onCheckedChange = vi.fn();
      const onChange = vi.fn();

      render(
        <FileActionCheckbox
          id="test-box"
          name="testName"
          value="testVal"
          checked={false}
          onCheckedChange={onCheckedChange}
          onChange={onChange}
        />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDefined();

      fireEvent.click(checkbox);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { checked: true, name: "testName", value: "testVal" },
        }),
      );
    });

    it("handles onCheckedChange without onChange and onChange without onCheckedChange", () => {
      const onCheckedChange = vi.fn();
      const { rerender } = render(
        <FileActionCheckbox checked={true} onCheckedChange={onCheckedChange} />,
      );

      fireEvent.click(screen.getByRole("checkbox"));
      expect(onCheckedChange).toHaveBeenCalledWith(false);

      const onChange = vi.fn();
      rerender(<FileActionCheckbox checked={false} onChange={onChange} />);

      fireEvent.click(screen.getByRole("checkbox"));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { checked: true, name: undefined, value: undefined },
        }),
      );
    });

    it("renders indeterminate state with minus icon and disabled state", () => {
      render(
        <FileActionCheckbox indeterminate disabled className="custom-class" />,
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDefined();
      expect(checkbox.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("Default export (SelectFileCheckbox)", () => {
    const Wrapper = ({
      selected = [],
      children,
    }: {
      selected?: string[];
      children: React.ReactNode;
    }) => {
      const isReady = ServerContext.useStoreState((s) => !!s.server.data);
      const setServer = ServerContext.useStoreActions(
        (a) => a.server.setServer,
      );
      const setSelectedFiles = ServerContext.useStoreActions(
        (a) => a.files.setSelectedFiles,
      );

      useEffect(() => {
        setServer({ id: "1", uuid: "server-1" } as any);
        setSelectedFiles(selected);
      }, [selected]);

      if (!isReady) return null;
      return <>{children}</>;
    };

    it("appends file to selectedFiles when checked", async () => {
      render(
        <ServerContext.Provider>
          <Wrapper selected={[]}>
            <SelectFileCheckbox name="config.json" />
          </Wrapper>
        </ServerContext.Provider>,
      );

      const checkbox = await screen.findByRole("checkbox");
      expect(checkbox.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(checkbox);
    });

    it("removes file from selectedFiles when unchecked", async () => {
      render(
        <ServerContext.Provider>
          <Wrapper selected={["config.json", "other.txt"]}>
            <SelectFileCheckbox name="config.json" />
          </Wrapper>
        </ServerContext.Provider>,
      );

      const checkbox = await screen.findByRole("checkbox");
      expect(checkbox.getAttribute("aria-checked")).toBe("true");

      fireEvent.click(checkbox);
    });
  });
});
