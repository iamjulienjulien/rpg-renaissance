// src/lib/fonts.ts
import {
    Fraunces,
    Cinzel,
    Cinzel_Decorative,
    Cormorant_SC,
    Fondamento,
    Marcellus,
    Orbitron,
    Courier_Prime,
} from "next/font/google";

export const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-fraunces",
    display: "swap",
});

export const cinzel = Cinzel({
    weight: ["400", "500", "600", "700", "800", "900"],
    subsets: ["latin"],
    variable: "--font-cinzel",
    display: "swap",
});

export const cinzelDecorative = Cinzel_Decorative({
    weight: ["400", "700", "900"],
    subsets: ["latin"],
    variable: "--font-cinzel-decorative",
    display: "swap",
});

export const cormorantSc = Cormorant_SC({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ["latin"],
    variable: "--font-cormorant-sc",
    display: "swap",
});

export const fondamento = Fondamento({
    weight: ["400"],
    subsets: ["latin"],
    variable: "--font-fondamento",
    display: "swap",
});

export const marcellus = Marcellus({
    weight: ["400"],
    subsets: ["latin"],
    variable: "--font-marcellus",
    display: "swap",
});

export const orbitron = Orbitron({
    weight: ["400"],
    subsets: ["latin"],
    variable: "--font-orbitron",
    display: "swap",
});

export const courierPrime = Courier_Prime({
    weight: ["400", "700"],
    subsets: ["latin"],
    variable: "--font-courier-prime",
    display: "swap",
});

export const fontsVariables = [
    fraunces.variable,
    cinzel.variable,
    cinzelDecorative.variable,
    cormorantSc.variable,
    fondamento.variable,
    marcellus.variable,
    orbitron.variable,
    courierPrime.variable,
];
