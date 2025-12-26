// src/components/motion/UiMotion.tsx
"use client";

import React from "react";
import {
    AnimatePresence,
    motion,
    MotionConfig,
    type AnimatePresenceProps,
    type HTMLMotionProps,
} from "framer-motion";
import { useUiStore } from "@/stores/uiStore";

export function UiMotionConfig(props: { children: React.ReactNode }) {
    const reduce = useUiStore((s) => s.reduceAnimations);

    return (
        <MotionConfig
            reducedMotion={reduce ? "always" : "user"}
            transition={reduce ? { duration: 0 } : undefined}
        >
            {props.children}
        </MotionConfig>
    );
}

// ✅ fix: on ajoute children au type
type UiAnimatePresenceProps = React.PropsWithChildren<AnimatePresenceProps>;

export function UiAnimatePresence({ children, ...rest }: UiAnimatePresenceProps) {
    const reduce = useUiStore((s) => s.reduceAnimations);

    if (reduce) {
        return <>{children}</>;
    }

    return <AnimatePresence {...rest}>{children}</AnimatePresence>;
}

type UiMotionDivProps = HTMLMotionProps<"div"> & {
    force?: boolean;
};

export const UiMotionDiv = React.forwardRef<HTMLDivElement, UiMotionDivProps>(function UiMotionDiv(
    { force, ...props },
    ref
) {
    const reduce = useUiStore((s) => s.reduceAnimations);
    const disabled = reduce && !force;

    if (disabled) {
        const {
            initial,
            animate,
            exit,
            transition,
            layout,
            layoutId,
            whileHover,
            whileTap,
            whileInView,
            viewport,
            drag,
            dragConstraints,
            dragElastic,
            dragMomentum,
            onAnimationStart,
            onAnimationComplete,
            onUpdate,
            onDrag,
            onDragStart,
            onDragEnd,
            ...rest
        } = props as any;

        return <div ref={ref} {...rest} />;
    }

    return <motion.div ref={ref} {...props} />;
});
