/**
 * Unit tests for app/providers.tsx (#241)
 * Tests that Providers renders children and supplies a working QueryClient context.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Providers from "../providers";

// Test component that consumes the QueryClient context
function TestChildComponent() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["testQueryKey"],
    queryFn: () => "queryClient-working",
    initialData: "initial-test-data",
  });

  return (
    <div>
      <span data-testid="child-element">Child Content Rendered</span>
      <span data-testid="query-status">
        {queryClient ? "QueryClient Available" : "No QueryClient"}
      </span>
      <span data-testid="query-data">{data}</span>
    </div>
  );
}

describe("app/providers.tsx (#241)", () => {
  it("renders children elements without crashing", () => {
    render(
      <Providers>
        <div data-testid="simple-child">Hello Providers</div>
      </Providers>
    );

    expect(screen.getByTestId("simple-child")).toBeInTheDocument();
    expect(screen.getByText("Hello Providers")).toBeInTheDocument();
  });

  it("supplies a working QueryClient context to descendant components", () => {
    render(
      <Providers>
        <TestChildComponent />
      </Providers>
    );

    expect(screen.getByTestId("child-element")).toHaveTextContent("Child Content Rendered");
    expect(screen.getByTestId("query-status")).toHaveTextContent("QueryClient Available");
    expect(screen.getByTestId("query-data")).toHaveTextContent("initial-test-data");
  });

  it("initializes QueryClient with expected default options", () => {
    let capturedClient: any = null;

    function ConfigCaptureComponent() {
      capturedClient = useQueryClient();
      return null;
    }

    render(
      <Providers>
        <ConfigCaptureComponent />
      </Providers>
    );

    expect(capturedClient).toBeDefined();
    const defaultQueryOptions = capturedClient.getDefaultOptions().queries;
    expect(defaultQueryOptions.staleTime).toBe(5 * 60 * 1000);
    expect(defaultQueryOptions.retry).toBe(3);
    expect(defaultQueryOptions.refetchOnWindowFocus).toBe(false);
    expect(defaultQueryOptions.refetchOnReconnect).toBe(false);

    const defaultMutationOptions = capturedClient.getDefaultOptions().mutations;
    expect(defaultMutationOptions.retry).toBe(0);
  });

  it("permits setting and retrieving query cache data via QueryClient", () => {
    let capturedClient: any = null;

    function CacheTestComponent() {
      capturedClient = useQueryClient();
      return null;
    }

    render(
      <Providers>
        <CacheTestComponent />
      </Providers>
    );

    capturedClient.setQueryData(["customKey"], { points: 1500 });
    const cachedData = capturedClient.getQueryData(["customKey"]);
    expect(cachedData).toEqual({ points: 1500 });
  });
});
