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
});
