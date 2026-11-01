import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import Pagination from "./Pagination";
import { PaginatedResult } from "@/api/http";

describe("Pagination component", () => {
  afterEach(cleanup);

  const mockData: PaginatedResult<string> = {
    items: ["Server 1", "Server 2"],
    pagination: {
      total: 50,
      count: 2,
      perPage: 10,
      currentPage: 3,
      totalPages: 5,
    },
  };

  it("renders children with items, isFirstPage, and isLastPage flags", () => {
    const onPageSelect = vi.fn();

    const { getByText } = render(
      <Pagination data={mockData} onPageSelect={onPageSelect}>
        {({ items, isFirstPage, isLastPage }) => (
          <div>
            <span>Items: {items.join(", ")}</span>
            <span>First: {isFirstPage ? "yes" : "no"}</span>
            <span>Last: {isLastPage ? "yes" : "no"}</span>
          </div>
        )}
      </Pagination>,
    );

    expect(getByText("Items: Server 1, Server 2")).toBeDefined();
    expect(getByText("First: no")).toBeDefined();
    expect(getByText("Last: no")).toBeDefined();
  });

  it("marks isFirstPage as true on page 1", () => {
    const firstPageData: PaginatedResult<string> = {
      ...mockData,
      pagination: { ...mockData.pagination, currentPage: 1 },
    };

    const { getByText } = render(
      <Pagination data={firstPageData} onPageSelect={vi.fn()}>
        {({ isFirstPage, isLastPage }) => (
          <div>
            <span>First: {isFirstPage ? "yes" : "no"}</span>
            <span>Last: {isLastPage ? "yes" : "no"}</span>
          </div>
        )}
      </Pagination>,
    );

    expect(getByText("First: yes")).toBeDefined();
    expect(getByText("Last: no")).toBeDefined();
  });

  it("marks isLastPage as true on the final page", () => {
    const lastPageData: PaginatedResult<string> = {
      ...mockData,
      pagination: { ...mockData.pagination, currentPage: 5 },
    };

    const { getByText } = render(
      <Pagination data={lastPageData} onPageSelect={vi.fn()}>
        {({ isFirstPage, isLastPage }) => (
          <div>
            <span>First: {isFirstPage ? "yes" : "no"}</span>
            <span>Last: {isLastPage ? "yes" : "no"}</span>
          </div>
        )}
      </Pagination>,
    );

    expect(getByText("First: no")).toBeDefined();
    expect(getByText("Last: yes")).toBeDefined();
  });

  it("calls onPageSelect when page buttons are clicked", () => {
    const onPageSelect = vi.fn();

    const { getByText } = render(
      <Pagination data={mockData} onPageSelect={onPageSelect}>
        {() => <div>Content</div>}
      </Pagination>,
    );

    // Click page 4
    fireEvent.click(getByText("4"));
    expect(onPageSelect).toHaveBeenCalledWith(4);
  });

  it("renders ChevronsLeft and ChevronsRight and calls onPageSelect with page 1 and totalPages", () => {
    const onPageSelect = vi.fn();
    const multiPageData: PaginatedResult<string> = {
      items: ["Server 1"],
      pagination: {
        total: 100,
        count: 1,
        perPage: 10,
        currentPage: 5,
        totalPages: 10,
      },
    };

    const { container } = render(
      <Pagination data={multiPageData} onPageSelect={onPageSelect}>
        {() => <div>Content</div>}
      </Pagination>,
    );

    const buttons = container.querySelectorAll("button");
    // First button is ChevronsLeft (go to page 1)
    fireEvent.click(buttons[0]);
    expect(onPageSelect).toHaveBeenCalledWith(1);

    // Last button is ChevronsRight (go to page 10)
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onPageSelect).toHaveBeenCalledWith(10);
  });

  it("does not render pagination controls when there is only 1 page", () => {
    const singlePageData: PaginatedResult<string> = {
      items: ["Server 1"],
      pagination: {
        total: 1,
        count: 1,
        perPage: 10,
        currentPage: 1,
        totalPages: 1,
      },
    };

    const { container, getByText } = render(
      <Pagination data={singlePageData} onPageSelect={vi.fn()}>
        {() => <div>Single Page Content</div>}
      </Pagination>,
    );

    expect(getByText("Single Page Content")).toBeDefined();
    expect(container.querySelectorAll("button").length).toBe(0);
  });
});
