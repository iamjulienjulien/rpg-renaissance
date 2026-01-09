// src/components/ui/UiImage.tsx
"use client";

import React from "react";
import Image, { type ImageProps } from "next/image";

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* ============================================================================
🧠 TYPES
============================================================================ */

export type UiImageFit = "cover" | "contain" | "fill" | "none" | "scale-down";

export type UiImageRadius = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full" | "custom";

export type UiImageBorder =
    | "none"
    | "subtle" // ring white/10
    | "solid" // ring white/20
    | "strong" // ring white/30
    | "custom";

export type UiImageFilter =
    | "none"
    | "soft" // léger boost + netteté
    | "bw"
    | "sepia"
    | "vintage"
    | "noir"
    | "dream"
    | "glow"
    | "fog"
    | "custom";

export type UiImageTone =
    | "none"
    | "dim" // assombrit un poil
    | "dark" // assombrit plus
    | "custom"; // via overlayClassName

export type UiImageThumbnail =
    | false
    | "soft" // cadre + fond + hover léger
    | "solid" // plus contrasté
    | "glass"; // effet verre (backdrop)

type BaseProps = {
    /** Source */
    src: string;

    /** Accessibilité */
    alt: string;

    /** Layout */
    className?: string;
    imgClassName?: string;
    wrapperClassName?: string;

    /** Sizing */
    width?: number; // recommandé si you use <img> fallback
    height?: number;
    aspect?: "square" | "portrait" | "landscape" | "wide" | "auto";
    wrapperStyle?: React.CSSProperties;
    layout?: "fill" | "fixed"; // default "fill"

    /** Object fit */
    fit?: UiImageFit;
    position?: string; // object-position, ex: "center", "top", "50% 30%"

    /** UI */
    radius?: UiImageRadius;
    radiusClassName?: string;

    border?: UiImageBorder;
    borderClassName?: string;

    shadow?: boolean;
    blurBg?: boolean; // fond flouté derrière (utile pour contain)
    zoomOnHover?: boolean;

    /** Thumbnail style */
    thumbnail?: UiImageThumbnail;

    /** Filters */
    filter?: UiImageFilter;
    filterClassName?: string;

    /** Overlay (assombrir, etc.) */
    tone?: UiImageTone;
    overlayClassName?: string;

    /** States */
    loading?: "eager" | "lazy";
    priority?: boolean;
    draggable?: boolean;

    /** Events */
    onClick?: () => void;
    onLoad?: () => void;
    onError?: () => void;

    /** Advanced */
    useNextImage?: boolean; // default true
};

export type UiImageProps = BaseProps &
    Omit<ImageProps, "src" | "alt" | "width" | "height" | "fill" | "onLoad" | "onError">;

/* ============================================================================
🎨 STYLES MAPS
============================================================================ */

const radiusMap: Record<Exclude<UiImageRadius, "custom">, string> = {
    none: "rounded-none",
    sm: "rounded-md",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
    "2xl": "rounded-[28px]",
    "3xl": "rounded-[34px]",
    full: "rounded-full",
};

const borderMap: Record<Exclude<UiImageBorder, "custom">, string> = {
    none: "",
    subtle: "ring-1 ring-white/10",
    solid: "ring-1 ring-white/20",
    strong: "ring-1 ring-white/30",
};

const aspectMap: Record<Exclude<NonNullable<UiImageProps["aspect"]>, "auto">, string> = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    landscape: "aspect-[4/3]",
    wide: "aspect-[16/9]",
};

const filterMap: Record<Exclude<UiImageFilter, "custom">, string> = {
    none: "",
    soft: "contrast-[1.03] saturate-[1.06] brightness-[1.02]",
    bw: "grayscale",
    sepia: "sepia",
    vintage: "sepia-[0.35] contrast-[1.05] saturate-[0.9] brightness-[1.02]",
    noir: "grayscale contrast-[1.1] brightness-[0.95]",
    dream: "saturate-[1.2] contrast-[0.95] brightness-[1.06]",
    glow: "contrast-[1.02] saturate-[1.05] brightness-[1.03] drop-shadow-[0_0_10px_rgba(255,255,255,0.12)]",
    fog: "contrast-[0.92] saturate-[0.95] brightness-[1.05]",
};

const toneMap: Record<Exclude<UiImageTone, "custom">, string> = {
    none: "",
    dim: "bg-black/15",
    dark: "bg-black/30",
};

const thumbMap: Record<Exclude<UiImageThumbnail, false>, string> = {
    soft: cn("bg-black/20 ring-1 ring-white/10", "hover:ring-white/20 hover:bg-black/25"),
    solid: cn("bg-black/35 ring-1 ring-white/15", "hover:ring-white/25 hover:bg-black/40"),
    glass: cn(
        "bg-white/5 ring-1 ring-white/15 backdrop-blur",
        "hover:bg-white/10 hover:ring-white/25"
    ),
};

/* ============================================================================
🧩 COMPONENT
============================================================================ */

export default function UiImage({
    src,
    alt,

    className,
    imgClassName,
    wrapperClassName,

    width,
    height,
    aspect = "auto",
    wrapperStyle,
    layout = "fill",

    fit = "cover",
    position = "center",

    radius = "lg",
    radiusClassName,

    border = "subtle",
    borderClassName,

    shadow = true,
    blurBg = false,
    zoomOnHover = false,

    thumbnail = false,

    filter = "none",
    filterClassName,

    tone = "none",
    overlayClassName,

    loading = "lazy",
    priority = false,
    draggable = false,

    onClick,
    onLoad,
    onError,

    useNextImage = true,

    ...nextImageProps
}: UiImageProps) {
    const r = radius === "custom" ? (radiusClassName ?? radiusMap.lg) : radiusMap[radius];
    const b = border === "custom" ? (borderClassName ?? borderMap.subtle) : borderMap[border];
    const f = filter === "custom" ? (filterClassName ?? "") : filterMap[filter];
    const overlay = tone === "custom" ? (overlayClassName ?? "") : toneMap[tone];

    const isFill = layout === "fill";

    const aspectClass = isFill && aspect !== "auto" ? aspectMap[aspect] : "";
    const isClickable = typeof onClick === "function";

    // En fixed, on exige width/height (sinon fallback)
    const fixedW = typeof width === "number" ? width : undefined;
    const fixedH = typeof height === "number" ? height : undefined;
    const canFixed = !!fixedW && !!fixedH;

    return (
        <div
            className={cn(
                "overflow-hidden",
                isFill ? "relative" : "relative inline-block",
                aspectClass,
                r,
                b,
                shadow && "shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_14px_40px_rgba(0,0,0,0.55)]",
                thumbnail && thumbMap[thumbnail],
                isClickable && "cursor-pointer select-none",
                wrapperClassName,
                className
            )}
            style={{
                ...(wrapperStyle ?? {}),
                ...(isFill ? {} : canFixed ? { width: fixedW, height: fixedH } : {}),
            }}
            onClick={onClick}
        >
            {blurBg ? (
                <div className={cn("absolute inset-0 scale-110 blur-2xl opacity-40", r)}>
                    <img
                        src={src}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                    />
                </div>
            ) : null}

            {useNextImage ? (
                isFill ? (
                    <Image
                        {...nextImageProps}
                        src={src}
                        alt={alt}
                        fill
                        priority={priority}
                        draggable={draggable}
                        loading={loading}
                        onLoad={onLoad}
                        onError={onError as any}
                        className={cn(
                            "absolute inset-0 h-full w-full",
                            zoomOnHover && "transition-transform duration-300 hover:scale-[1.03]",
                            f,
                            imgClassName
                        )}
                        style={{
                            objectFit: fit as any,
                            objectPosition: position,
                            ...(nextImageProps.style ?? {}),
                        }}
                        sizes={nextImageProps.sizes ?? "100vw"}
                    />
                ) : (
                    <Image
                        {...nextImageProps}
                        src={src}
                        alt={alt}
                        width={fixedW ?? 512}
                        height={fixedH ?? 512}
                        priority={priority}
                        draggable={draggable}
                        loading={loading}
                        onLoad={onLoad}
                        onError={onError as any}
                        className={cn(
                            "block h-full w-full",
                            zoomOnHover && "transition-transform duration-300 hover:scale-[1.03]",
                            f,
                            imgClassName
                        )}
                        style={{
                            objectFit: fit as any,
                            objectPosition: position,
                            ...(nextImageProps.style ?? {}),
                        }}
                    />
                )
            ) : (
                <img
                    src={src}
                    alt={alt}
                    width={fixedW}
                    height={fixedH}
                    draggable={draggable}
                    loading={loading}
                    onLoad={onLoad}
                    onError={onError}
                    className={cn(
                        isFill ? "absolute inset-0 h-full w-full" : "block h-full w-full",
                        zoomOnHover && "transition-transform duration-300 hover:scale-[1.03]",
                        f,
                        imgClassName
                    )}
                    style={{
                        objectFit: fit,
                        objectPosition: position,
                    }}
                />
            )}

            {overlay ? (
                <div className={cn("absolute inset-0 pointer-events-none", overlay)} />
            ) : null}

            {thumbnail ? (
                <div
                    className={cn(
                        "absolute inset-0 pointer-events-none",
                        "ring-1 ring-inset ring-white/10",
                        r
                    )}
                />
            ) : null}
        </div>
    );
}
/* ============================================================================
✨ EXAMPLES

<UiImage
  src={avatarUrl}
  alt="Avatar"
  aspect="square"
  radius="2xl"
  border="solid"
  thumbnail="soft"
  filter="soft"
  zoomOnHover
/>

<UiImage
  src={photoUrl}
  alt="Portrait"
  aspect="portrait"
  fit="contain"
  blurBg
  tone="dim"
  thumbnail="glass"
/>

<UiImage
  src={url}
  alt="Cinematic"
  aspect="wide"
  filter="noir"
  border="strong"
/>

============================================================================ */
