import type { Metadata } from "next";
import { BuilderShell } from "./BuilderShell";

export const metadata: Metadata = {
  title: "Build your cake — Makemycake",
};

export default function BuildLayout({ children }: { children: React.ReactNode }) {
  return <BuilderShell>{children}</BuilderShell>;
}
