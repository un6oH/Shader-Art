const FS = 
`#version 300 es

precision highp float;

in vec2 planeCoord; // plane coordinate, offset

uniform int maxIterations;
uniform float expOffset;

out vec4 colour;

vec2 complexMult(vec2 a, vec2 b) {
  return vec2((a.x * b.x - a.y * b.y) / expOffset, (a.x * b.y + a.y * b.x) / expOffset);
}

vec4 scale(float x) {
  return vec4(vec3(x), 1);
}

void main() {
  vec2 z = planeCoord;
  int i = 0;
  while (length(z) < 2.0 * expOffset && i < maxIterations) {
    vec2 zSquared = complexMult(z, z);
    z = complexMult(z, z) + planeCoord;
    i++;
  }
  colour = scale(float(i) / float(maxIterations));
}

`;