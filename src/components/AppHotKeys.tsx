"use client";

import React from "react";
import { useGlobalHotkeys } from "@/lib/useGlobalHotkeys";

export default function AppHotkeys() {
    useGlobalHotkeys();
    return null;
}
