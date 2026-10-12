import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PaginationFooter from "./PaginationFooter";

describe("components/elements/table/PaginationFooter", () => {
  it("returns null when total is 0", () => {
    const { container } = render(
      <PaginationFooter
        pagination={{
          total: 0,
          count: 0,
          perPage: 10,
          currentPage: 1,
          totalPages: 0,
        }}
        onPageSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders single page text without navigation buttons when totalPages is 1", () => {
    render(
      <PaginationFooter
        pagination={{
          total: 5,
          count: 5,
          perPage: 10,
          currentPage: 1,
          totalPages: 1,
        }}
        onPageSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/results\./)).toBeTruthy();
    expect(screen.queryByLabelText("First page")).toBeNull();
  });

  it("renders full pagination controls and handles page clicks", () => {
    const onPageSelect = vi.fn();
    render(
      <PaginationFooter
        pagination={{
          total: 100,
          count: 10,
          perPage: 10,
          currentPage: 5,
          totalPages: 10,
        }}
        onPageSelect={onPageSelect}
      />,
    );

    expect(screen.getByText(/results\./)).toBeTruthy();

    const firstPageBtn = screen.getByLabelText("First page");
    expect(firstPageBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(firstPageBtn);
    expect(onPageSelect).toHaveBeenCalledWith(1);

    const prevPageBtn = screen.getByLabelText("Page 4");
    fireEvent.click(prevPageBtn);
    expect(onPageSelect).toHaveBeenCalledWith(4);

    const nextPageBtn = screen.getByLabelText("Page 6");
    fireEvent.click(nextPageBtn);
    expect(onPageSelect).toHaveBeenCalledWith(6);

    const lastPageBtn = screen.getByLabelText("Last page");
    expect(lastPageBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(lastPageBtn);
    expect(onPageSelect).toHaveBeenCalledWith(10);
  });

  it("disables first page on page 1 and last page on last page", () => {
    const { rerender } = render(
      <PaginationFooter
        pagination={{
          total: 20,
          count: 10,
          perPage: 10,
          currentPage: 1,
          totalPages: 2,
        }}
        onPageSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("First page").hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByLabelText("Last page").hasAttribute("disabled")).toBe(
      false,
    );

    rerender(
      <PaginationFooter
        pagination={{
          total: 20,
          count: 10,
          perPage: 10,
          currentPage: 2,
          totalPages: 2,
        }}
        onPageSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("First page").hasAttribute("disabled")).toBe(
      false,
    );
    expect(screen.getByLabelText("Last page").hasAttribute("disabled")).toBe(
      true,
    );
  });
});
