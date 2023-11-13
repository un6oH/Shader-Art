const FS = 
`#version 300 es

precision highp float;

in vec2 relativePosition; // position relative to centre

uniform vec2 centre; // coords of centre
uniform vec2 range;
uniform int maxIterations;

out vec4 colour;

float p;

vec2 complexMult(vec4 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec4 scale(float x) {
  return vec4(vec3(x), 1);
}

vec2 rfComponents(float a) { // deconstruction
  float q = a / p;
  float g = p * floor(q); // gross component
  float f = (a - g) / p; // fine component
  return vec2(g, f);
}

float rfToFloat(vec2 a) {
  return a.x + p * a.y;
}

vec2 rfAdd(vec2 a, vec2 b) { // recursive float add
  vec2 fSum = rfComponents(p * (a.y + b.y)); // sum of fine components
  float g = a.x + b.x + fSum.x; // gross component
  return vec2(g, fSum.y);
}

vec2 rfMult(vec2 a, vec2 b) { // recursive float mult
  vec2 t1 = rfComponents(a.x * b.x); // 1st term
  vec2 t2 = rfComponents(a.x * p * b.y); // 2nd term
  vec2 t3 = rfComponents(p * a.y * b.x);
  vec2 t4 = rfComponents(p * p * a.y * b.y);

  vec2 fSum = rfComponents(p * (t1.y + t2.y + t3.y + t4.y));
  float gSum = t1.x + t2.x + t3.x + t4.x;
  return vec2(gSum + fSum.x, fSum.y);
}

vec4 rvAdd(vec4 a, vec4 b) {
  return vec4(rfAdd(a.xy, b.xy), rfAdd(a.zw, b.zw));
}

float rvLengthSquared(vec4 a) {
  vec2 xSquared = rfMult(a.xy, a.xy);
  vec2 ySquared = rfMult(a.zw, a.zw);
  return rfToFloat(rfAdd(xSquared, ySquared));
}

vec4 rvComplexMult(vec4 a, vec4 b) { // z = z_rg + z_rf + (z_ig + z_if)i
  vec2 ar = a.xy;
  vec2 ai = a.zw;
  vec2 br = b.xy;
  vec2 bi = b.zw;

  vec2 real = rfAdd( rfMult(ar, br), -1.0 * rfMult(ai, bi) );
  vec2 imaginary = rfAdd( rfMult(ar, bi), rfMult(ai, br) );
  return vec4(real, imaginary);
}

void main() {
  // p = range.y;
  p = pow(2.0, -24.0);
  vec4 c = vec4(rfComponents(centre.x), rfComponents(centre.y)); // components of centre
  vec4 r = vec4(rfComponents(relativePosition.x), rfComponents(relativePosition.y)); // components of relative position
  vec4 C = rvAdd(c, r); // constant C
  vec4 z = C; // z
  int i = 0;
  while (abs(rvLengthSquared(z)) < 4.0 && i < maxIterations) {
    z = rvComplexMult(z, z);
    z = rvAdd(z, C);
    i++;
  }
  colour = scale(float(i) / float(maxIterations));
}

`;