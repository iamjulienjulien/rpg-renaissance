"use client";

import data from "@/content/emoji.json" with { type: "json" };

import * as React from "react";
function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

type EmojiPickerProps = {
    value?: string | null;
    onChange: (emoji: string) => void;
    disabled?: boolean;
};

const EMOJIS = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "🙂",
    "😉",
    "😍",
    "😎",
    "🤔",
    "😌",
    "🥹",
    "😤",
    "😭",
    "😡",
    "🤯",
    "🔥",
    "✨",
    "⚡",
    "🌱",
    "🌿",
    "🍀",
    "🌙",
    "⭐",
    "🧠",
    "🫀",
    "💪",
    "🦾",
    "👣",
    "🗺️",
    "🧭",
    "🗝️",
    "📜",
    "🪶",
    "⚔️",
    "🛡️",
    "🏹",
    "🧙",
    "🧘",
    "🎯",
    "🏔️",
    "🚪",
    "🕯️",
    "🔮",
];

export default function UiEmojiPicker({ value, onChange, disabled }: EmojiPickerProps) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    console.log("data", data);

    const categories = ["Activities", "Travel & Places"];

    const availableCategories: any[] = [];

    data.forEach((d) => {
        if (!availableCategories.includes(d.category)) {
            availableCategories.push(d.category);
        }
    });

    console.log("a", availableCategories);

    let emo: any[] = [];
    data.filter((d) => categories.includes(d.category)).forEach((d) => {
        const e = String.fromCodePoint(parseInt(d.unified, 16));
        // console.log("d", e);
        emo.push(e);
    });

    // close on outside click
    React.useEffect(() => {
        function onClick(e: MouseEvent) {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "flex items-center justify-center",
                    "w-12 h-12 rounded-lg border",
                    "text-2xl",
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                )}
            >
                {value || "🙂"}
            </button>

            {open && !disabled && (
                <div
                    className="
                        absolute z-50 mt-2
                        w-64 max-h-60 overflow-y-auto
                        rounded-xl border bg-black shadow-lg
                        p-2 grid grid-cols-8 gap-1
                    "
                >
                    {emo.map((emoji) => (
                        <button
                            key={emoji.name}
                            type="button"
                            onClick={() => {
                                onChange(emoji);
                                setOpen(false);
                            }}
                            className="
                                text-xl p-1 rounded
                                hover:bg-muted
                                focus:outline-none focus:ring-2 focus:ring-ring
                            "
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
