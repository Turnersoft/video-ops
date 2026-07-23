import * as manim from 'manim-web';
import type { Scene } from 'manim-web';

export type ManimConstruct = (scene: Scene) => Promise<void>;

const MANIM_BINDINGS = `
const {
  Scene, Circle, Square, Rectangle, Line, Arrow, Dot, VGroup, Group,
  Create, Transform, FadeIn, FadeOut, Write, GrowFromCenter, Wait,
  MathTex, Text, Axes, NumberPlane, FunctionGraph, Polygon, Triangle,
  AnimationGroup, LaggedStart, Indicate, UP, DOWN, LEFT, RIGHT, ORIGIN,
  FadeTransform, ReplacementTransform,
} = manim;
`;

export function compileManimWebCode(code: string): {
    construct: ManimConstruct | null;
    error: string | null;
} {
    const trimmed = code.trim();
    if (!trimmed) {
        return { construct: null, error: null };
    }
    try {
        const factory = new Function(
            'manim',
            `${MANIM_BINDINGS}\nreturn async function(scene) {\n${trimmed}\n};`,
        ) as (lib: typeof manim) => ManimConstruct;
        const construct = factory(manim);
        return { construct, error: null };
    } catch (err) {
        return {
            construct: null,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
